const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");

module.exports = {
  async sync(ctx) {
    try {
      const { cid, year } = ctx.query;
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

      if (teams.length > 0) {
        await Promise.all(
          teams.map(async (team) => {
            const existStanding = await strapi.services.standing.findOne({
              sid: season.id,
              tid: team.id,
            });
            if (existStanding) return existStanding;
            await strapi.services.standing.create({
              sid: season.id,
              tid: team.id,
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
          })
        );
      }
      ctx.send({
        message: "sync standing success",
        status: 200,
      });
    } catch (error) {
      console.error(error);
    }
  },

  async updateScores(ctx) {
    try {
      const { cid, year } = ctx.query;
      const res = await axios.get(
        `${process.env.FB_URL}/competitions/${cid}/matches?season=${year}&status=FINISHED`,
        {
          headers: fbHeader,
        }
      );
      const { matches } = res.data;
      let count = 0;
      const length = matches.length
      if (length > 0) {
        for (const match of matches) {
          const { season, homeTeam, awayTeam } = match;

          let home = await strapi.services.standing.findOne({
            tid: homeTeam.id,
            sid: season.id,
          });

          let away = await strapi.services.standing.findOne({
            tid: awayTeam.id,
            sid: season.id,
          });

          if (home && away) {
            await getTeamScores(true, home, match);
            await getTeamScores(false, away, match);
            count++;
            console.log(`updated (${count}/${length}) - match id: ${match.id}`)
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
  },
};

const getTeamScores = async (isHome, team, match) => {
  try {
    const { score, id, homeTeam, awayTeam, season } = match;
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
      id,
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
        id,
        homeTeam,
        awayTeam,
      });

      await strapi.services.standing.update(
        {
          tid: homeTeam.id,
          sid: season.id,
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
        id,
        homeTeam,
        awayTeam,
      });

      await strapi.services.standing.update(
        {
          tid: awayTeam.id,
          sid: season.id,
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
