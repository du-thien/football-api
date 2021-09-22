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
 
        if (home && away) {
          matchExisted = await strapi.services.match.create({
            mid: id,
            sid: season.id,
            utcDate: moment(utcDate).format("YYYY-MM-DD HH:mm:ss"),
            status,
            matchday,
            odds: [],
            score,
            homeTeam,
            awayTeam,
            referees,
          });
          console.log(`create match - id: ${match.id}`);
          data.push(matchExisted);
        } else {
          throw home;
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

const getStanding = async (ctx) => {
  let { cid, year } = ctx.query;
  if (!year) {
    const currentSeason = await strapi.services.competition.findOne({ cid: cid });
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
  const {matches} = res.data;
  if (matches.length < 0) {
    return;
  }

  // await refreshStandings(sid);
  let arrMatch = [];
  let totalMatchs = 0;
  let matchDraw = 0;
  let pastMatches = 0;
  for (const v of matches) {
    let utcDate = moment(v.utcDate).format("YYYY-MM-DD HH:mm:ss");
    let queryMatch = { mid: v.id };
    let match = await strapi.services.match.findOne(queryMatch);
    if (match) {
      strapi.services.match.update(queryMatch, {
        status: v.status,
        matchday: v.matchday,
        odds: [],
        group: v.group,
        score: v.score, //arr
        homeTeam: v.homeTeam, //arr
        awayTeam: v.awayTeam, //arr
        referees: v.referees, //arr
      });
    } else {
      arrMatch.push({
        mid: v.id,
        sid: v.season.id,
        utcDate: utcDate,
        status: v.status,
        matchday: v.matchday,
        odds: [],
        group: v.group,
        score: v.score,
        homeTeam: v.homeTeam,
        awayTeam: v.awayTeam,
        referees: v.referees,
      });
    }

    // Handle standing homeTeam
    let queryH = {
      sid: v.season.id,
      tid: v.homeTeam.id,
    };

    let teamH = await strapi.services.standing.findOne(queryH);

    let queryA = {
      sid: v.season.id,
      tid: v.awayTeam.id,
    };

    let teamA = await strapi.services.standing.findOne(queryA);
    if (teamH && teamA) {
      continue;
    }

    let goalsHT = v.score.fullTime.homeTeam;
    let goalsAT = v.score.fullTime.awayTeam;
    let arrHistoryMatch = {
      id: v.id,
      homeTeam: v.homeTeam,
      awayTeam: v.awayTeam,
      goalsHT,
      goalsAT,
    };

    // Data Season
    pastMatches = v.score.winner ? pastMatches + 1 : pastMatches;
    matchDraw = v.score.winner === "DRAW" ? matchDraw + 1 : matchDraw;
    totalMatchs += 1;

    // Home
    let pointsH =
      v.score.winner === "HOME_TEAM"
        ? teamH.points + 3
        : v.score.winner === "DRAW"
        ? teamH.points + 1
        : teamH.points;
    let wonH = v.score.winner === "HOME_TEAM" ? teamH.won + 1 : teamH.won;
    let drawH = v.score.winner === "DRAW" ? teamH.draw + 1 : teamH.draw;
    let lostH = v.score.winner === "AWAY_TEAM" ? teamH.lost + 1 : teamH.lost;
    let playedGamesH = v.score.winner
      ? teamH.playedGames + 1
      : teamH.playedGames;
    let winHome =
      v.score.winner === "HOME_TEAM" ? teamH.winHome + 1 : teamH.winHome;

    let goalsForH = goalsHT + teamH.goalsFor;
    let goalsAgainstH = goalsAT + teamH.goalsAgainst;
    let goalDifferenceH = goalsForH - goalsAgainstH;

    let goalsForHome = goalsHT + teamH.goalsForHome;
    let pointsHome =
      v.score.winner === "HOME_TEAM"
        ? teamH.pointsHome + 3
        : v.score.winner === "DRAW"
        ? teamH.pointsHome + 1
        : teamH.pointsHome;

    let arrHM = teamH.homeMatchs ? teamH.homeMatchs : [];
    arrHM.push({
      arrHistoryMatch,
    });

    let arrLastMH = teamH.lastMatchs ? teamH.lastMatchs : [];
    let arrNextMH = teamH.nextMatchs ? teamH.nextMatchs : [];
    if (v.score.winner) {
      arrLastMH.push(arrHistoryMatch);
    } else {
      arrNextMH.push(arrHistoryMatch);
    }

    // Away
    let pointsA =
      v.score.winner === "AWAY_TEAM"
        ? teamA.points + 3
        : v.score.winner === "DRAW"
        ? teamA.points + 1
        : teamA.points;
    let wonA = v.score.winner === "AWAY_TEAM" ? teamA.won + 1 : teamA.won;
    let drawA = v.score.winner === "DRAW" ? teamA.draw + 1 : teamA.draw;
    let lostA = v.score.winner === "HOME_TEAM" ? teamA.lost + 1 : teamA.lost;
    let playedGamesA = v.score.winner
      ? teamA.playedGames + 1
      : teamA.playedGames;
    let winAway =
      v.score.winner === "AWAY_TEAM" ? teamA.winAway + 1 : teamA.winAway;

    let goalsForA = goalsAT + teamA.goalsFor;
    let goalsAgainstA = goalsHT + teamA.goalsAgainst;
    let goalDifferenceA = goalsForA - goalsAgainstA;

    let goalsForAway = goalsAT + teamA.goalsForAway;
    let pointsAway =
      v.score.winner === "AWAY_TEAM"
        ? teamA.pointsAway + 3
        : v.score.winner === "DRAW"
        ? teamA.pointsAway + 1
        : teamA.pointsAway;

    let arrAM = teamA.awayMatchs ? teamA.awayMatchs : [];
    arrAM.push(arrHistoryMatch);

    let arrLastMA = teamA.lastMatchs ? teamA.lastMatchs : [];
    let arrNextMA = teamA.nextMatchs ? teamA.nextMatchs : [];
    if (v.score.winner) {
      arrLastMA.push(arrHistoryMatch);
    } else {
      arrNextMA.push(arrHistoryMatch);
    }

     strapi.services.standing.update(queryH, {
      playedGames: playedGamesH,
      won: wonH,
      draw: drawH,
      lost: lostH,
      points: pointsH,
      goalsFor: goalsForH,
      goalsAgainst: goalsAgainstH,
      goalDifference: goalDifferenceH,
      goalsForHome: goalsForHome,
      pointsHome: pointsHome,
      winHome: winHome,
      homeMatchs: arrHM,
      lastMatchs: arrLastMH,
      nextMatchs: arrNextMH,
    });
     strapi.services.standing.update(queryA, {
      playedGames: playedGamesA,
      won: wonA,
      draw: drawA,
      lost: lostA,
      points: pointsA,
      goalsFor: goalsForA,
      goalsAgainst: goalsAgainstA,
      goalDifference: goalDifferenceA,
      goalsForAway: goalsForAway,
      pointsAway: pointsAway,
      winAway: winAway,
      awayMatchs: arrAM,
      lastMatchs: arrLastMA,
      nextMatchs: arrNextMA,
    });
  }

  // let data_update_season = {
  //   $set: {
  //     totalMatchs,
  //     matchDraw,
  //     pastMatches,
  //   },
  // };

  // upseartSeason(data_update_season, { id: sid });

  if (arrMatch.length > 0) {
    for(const m of arrMatch) {
       strapi.services.match.create(m);
    }
  }

  ctx.send({
    message: "ok"
  })
};

const refreshStandings = async (sid) => {
  
};

module.exports = {
  sync,
  updateScores,
  getStanding
};
