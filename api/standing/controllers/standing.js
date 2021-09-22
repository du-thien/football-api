const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");
const moment = require("moment");

const sync = async (ctx) => {
  try {
    const { cid, year } = ctx.query;
    if (!year) {
      const currentSeason = await strapi.services.competition.findOne({ cid });
      year = new Date(currentSeason.startDate).getFullYear();
    }
    if (!cid) {
      return ctx.send({
        message: "missing cid field",
        status: 422,
      });
    }
    const res = await axios.get(
      `${process.env.FB_URL}/competitions/${cid}/teams?season=${year}`,
      {
        headers: fbHeader,
      }
    );
    const { teams, season, competition } = res.data;
    const comp = await strapi.services.competition.findOne({
      cid: competition.id,
    });
    let count = 0;
    const length = teams.length;
    if (length > 0) {
      for (const team of teams) {
        let standing = await strapi.services.standing.findOne({
          sid: season.id,
          tid: team.id,
        });
        if (!standing) {
          standing = await strapi.services.standing.create({
            sid: season.id,
            tid: team.id,
            year,
            name: team.name,
            competition: comp,
            position: 0,
            playedGames: 0,
            won: 0,
            draw: 0,
            lost: 0,
            points: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            goalsForAway: 0,
            goalsForHome: 0,
            pointsAway: 0,
            pointsHome: 0,
            homeMatches: [],
            awayMatches: [],
            lastMatches: [],
          });
        }
        count++;
        console.log(
          `get (${count}/${length}) - teams id: ${team.id} - standing id: ${standing.id}`
        );
      }
    }
    ctx.send({
      message: "sync standing success",
      status: 200,
    });
  } catch (error) {
    console.error(error);
  }
};

const updateScores = async (ctx) => {
  try {
    let { cid, year } = ctx.query;
    if (!year) {
      const currentSeason = await strapi.services.competition.findOne({ cid });
      year = new Date(currentSeason.startDate).getFullYear();
    }
    if (!cid) {
      return ctx.send({
        message: "missing cid field",
        status: 422,
      });
    }

    const res = await axios.get(
      `${process.env.FB_URL}/competitions/${cid}/matches?season=${year}`,
      {
        headers: fbHeader,
      }
    );
    let count = 0;
    const matches = await getMatches(res.data.matches);
    if (matches.length > 0) {
      for (const match of matches) {
        const { homeTeam, awayTeam, sid } = match;

        let home = await strapi.services.standing.findOne({
          tid: homeTeam.tid,
          sid,
        });

        let away = await strapi.services.standing.findOne({
          tid: awayTeam.tid,
          sid,
        });

        if (home && away) {
          await getTeamScores(true, home, match);
          await getTeamScores(false, away, match);
          count++;
          console.log(
            `updated (${count}/${matches.length}) - match id: ${match.id}`
          );
        }
      }
    }
    ctx.send({
      message: "update standing scores success",
      status: 200,
    });
  } catch (error) {
    console.error(error);
  }
};

const getMatches = async (matches) => {
  try {
    let data = [];
    for (const match of matches) {
      const {
        id,
        season,
        utcDate,
        status,
        matchday,
        score,
        homeTeam,
        awayTeam,
        referees,
      } = match;

      let matchExisted = await strapi.services.match.findOne({
        mid: id,
        sid: season.id,
        status: "FINISHED",
      });

      if (!matchExisted) {
        let home = await strapi.services.team.findOne({
          tid: homeTeam.id,
        });

        let away = await strapi.services.team.findOne({
          tid: awayTeam.id,
        });
        if (home && away) {
          matchExisted = await strapi.services.match.create({
            mid: id,
            sid: season.id,
            utcDate: moment(utcDate).format("YYYY-MM-DD HH:mm:ss"),
            status,
            matchday,
            odds: [],
            score,
            homeTeam: home,
            awayTeam: away,
            referees,
          });
          console.log(`create match - id: ${match.id}`);
          data.push(matchExisted);
        }
      }
    }
    return data;
  } catch (error) {
    console.error(error);
  }
};

const getTeamScores = async (isHome, team, match) => {
  try {
    const { score, mid, homeTeam, awayTeam, sid } = match;
    const win = isHome ? "HOME_TEAM" : "AWAY_TEAM";
    const lose = isHome ? "AWAY_TEAM" : "HOME_TEAM";
    let pointsTeam =
      score.winner === win
        ? team.points + 3
        : score.winner === "DRAW"
        ? team.points + 1
        : team.points;

    let won = score.winner === win ? team.won + 1 : team.won;
    let draw = score.winner === "DRAW" ? team.draw + 1 : team.draw;
    let lost = score.winner === lose ? team.lost + 1 : team.lost;
    let playedGamesTeam = team.playedGames + 1;

    const teamScores = isHome
      ? score.fullTime.homeTeam
      : score.fullTime.awayTeam;
    const otherScores = isHome
      ? score.fullTime.awayTeam
      : score.fullTime.homeTeam;
    let goalsForTeam = teamScores + team.goalsFor;
    let goalsAgainstTeam = otherScores + team.goalsAgainst;
    let goalsDifferenceTeam = goalsForTeam - goalsAgainstTeam;
    const teamGoalsFor = isHome ? team.goalsForHome : team.goalsForAway;

    let lastTeamMatches = team.lastMatches ? team.lastMatches : [];
    lastTeamMatches.push({
      mid,
      homeTeam,
      awayTeam,
    });

    if (isHome) {
      let goalsForHome = teamScores + teamGoalsFor;
      let pointsForHome =
        score.winner === win
          ? team.pointsHome + 3
          : score.winner === "DRAW"
          ? team.pointsHome + 1
          : team.pointsHome;

      let arrHomeMatches = team.homeMatches ? team.homeMatches : [];
      arrHomeMatches.push({
        mid,
        homeTeam,
        awayTeam,
      });

      strapi.services.standing.update(
        {
          tid: homeTeam.tid,
          sid,
        },
        {
          playedGames: playedGamesTeam,
          won: won,
          draw: draw,
          lost: lost,
          points: pointsTeam,
          goalsFor: goalsForTeam,
          goalsAgainst: goalsAgainstTeam,
          goalDifference: goalsDifferenceTeam,
          goalsForHome,
          pointsHome: pointsForHome,
          homeMatches: arrHomeMatches,
          lastMatches: lastTeamMatches,
        }
      );
    } else {
      let goalsForAway = score.fullTime.awayTeam + team.goalsForAway;
      let pointsForAway =
        score.winner === win
          ? team.pointsAway + 3
          : score.winner === "DRAW"
          ? team.pointsAway + 1
          : team.pointsAway;

      let arrAwayMatches = team.awayMatches ? team.awayMatches : [];
      arrAwayMatches.push({
        mid,
        homeTeam,
        awayTeam,
      });

      strapi.services.standing.update(
        {
          tid: awayTeam.tid,
          sid,
        },
        {
          playedGames: playedGamesTeam,
          won: won,
          draw: draw,
          lost: lost,
          points: pointsTeam,
          goalsFor: goalsForTeam,
          goalsAgainst: goalsAgainstTeam,
          goalDifference: goalsDifferenceTeam,
          goalsForAway,
          pointsHome: pointsForAway,
          awayMatches: arrAwayMatches,
          lastMatches: lastTeamMatches,
        }
      );
    }
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  sync,
  updateScores,
};
