const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");
const moment = require("moment");

const sync = async (ctx) => {
  try {
    let { cid, year } = ctx.query;
    let competitionFound = await strapi.services.competition.findOne({ cid });
    year = year
      ? year
      : competitionFound.currentSeason.startDate.substring(0, 4);
    if (!cid) {
      return ctx.send({
        message: "missing field",
        status: 422,
      });
    }
    const res = await axios.get(
      `${process.env.FB_URL}/competitions/${cid}/teams?season=${year}`,
      {
        headers: fbHeader,
      }
    );
    const { teams, season } = res.data;

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
            competition: competitionFound,
            position: 0,
            playedGames: 0,
            won: 0,
            draw: 0,
            lost: 0,
            winAway: 0,
            winHome: 0,
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
            nextMatches: [],
          });
        }
        count++;
        console.log(
          `create (${count}/${length}) - teams id: ${team.id} - standing id: ${standing.id}`
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

const getMatches = async (competition, year, action) => {
  const season = competition.currentSeason;
  year = year ? year : season.startDate.substring(0, 4);
  const { sid } = season;
  const res = await axios.get(
    `${process.env.FB_URL}/competitions/${competition.cid}/matches?season=${year}`,
    {
      headers: fbHeader,
    }
  );
  const { matches } = res.data;
  if (matches.length < 0) {
    return;
  }
  if (action === "insert") {
    await refreshStandings(sid);
  }

  let arrMatches = [];
  let nextMatches = [];
  let lastMatches = [];
  let totalMatches = 0;
  let drawMatches = 0;
  let pastMatches = 0;
  for (const match of matches) {
    const { score, homeTeam, awayTeam, status, matchday, group, referees } =
      match;
    let goalsHT = score.fullTime.homeTeam;
    let goalsAT = score.fullTime.awayTeam;
    let historyMatches = {
      mid: match.id,
      homeTeam,
      awayTeam,
      goalsHT,
      goalsAT,
    };
    pastMatches = score.winner ? pastMatches + 1 : pastMatches;
    drawMatches = score.winner === "DRAW" ? drawMatches + 1 : drawMatches;
    totalMatches += 1;
    if (score.winner) {
      lastMatches.push(historyMatches);
    } else {
      nextMatches.push(historyMatches);
    }

    if (action === "update") {
      let result = season.nextMatches.find(({ mid }) => mid === match.id);
      if (result && !score.winner) {
        break;
      }
      if (!result) {
        continue;
      }
    }

    let utcDate = moment(match.utcDate).format("YYYY-MM-DD HH:mm:ss");
    let queryMatch = { mid: match.id };
    let matchFind = await strapi.services.match.findOne(queryMatch);
    if (matchFind) {
      strapi.services.match.update(queryMatch, {
        status,
        matchday,
        odds: [],
        group,
        score,
        homeTeam,
        awayTeam,
        referees,
      });
    } else {
      arrMatches.push({
        mid: match.id,
        sid,
        utcDate,
        status,
        matchday,
        odds: [],
        group,
        score,
        homeTeam,
        awayTeam,
        referees,
      });
    }

    let queryHome = {
      sid,
      tid: homeTeam.id,
    };

    let homeStanding = await strapi.services.standing.findOne(queryHome);

    let queryAway = {
      sid,
      tid: awayTeam.id,
    };

    let awayStanding = await strapi.services.standing.findOne(queryAway);
    if (!homeStanding && !awayStanding) {
      continue;
    }

    // Home
    let pointsH =
      score.winner === "HOME_TEAM"
        ? homeStanding.points + 3
        : score.winner === "DRAW"
        ? homeStanding.points + 1
        : homeStanding.points;
    let wonH =
      score.winner === "HOME_TEAM" ? homeStanding.won + 1 : homeStanding.won;
    let drawH =
      score.winner === "DRAW" ? homeStanding.draw + 1 : homeStanding.draw;
    let lostH =
      score.winner === "AWAY_TEAM" ? homeStanding.lost + 1 : homeStanding.lost;
    let playedGamesH = score.winner
      ? homeStanding.playedGames + 1
      : homeStanding.playedGames;
    let winHome =
      score.winner === "HOME_TEAM"
        ? homeStanding.winHome + 1
        : homeStanding.winHome;

    let goalsForH = goalsHT + homeStanding.goalsFor;
    let goalsAgainstH = goalsAT + homeStanding.goalsAgainst;
    let goalDifferenceH = goalsForH - goalsAgainstH;

    let goalsForHome = goalsHT + homeStanding.goalsForHome;
    let pointsHome =
      score.winner === "HOME_TEAM"
        ? homeStanding.pointsHome + 3
        : score.winner === "DRAW"
        ? homeStanding.pointsHome + 1
        : homeStanding.pointsHome;

    let arrLastMH = homeStanding.lastMatches ? homeStanding.lastMatches : [];
    let arrNextMH = homeStanding.nextMatches ? homeStanding.nextMatches : [];
    if (score.winner) {
      arrLastMH.push(historyMatches);
    } else {
      arrNextMH.push(historyMatches);
    }

    // Away
    let pointsA =
      score.winner === "AWAY_TEAM"
        ? awayStanding.points + 3
        : score.winner === "DRAW"
        ? awayStanding.points + 1
        : awayStanding.points;
    let wonA =
      score.winner === "AWAY_TEAM" ? awayStanding.won + 1 : awayStanding.won;
    let drawA =
      score.winner === "DRAW" ? awayStanding.draw + 1 : awayStanding.draw;
    let lostA =
      score.winner === "HOME_TEAM" ? awayStanding.lost + 1 : awayStanding.lost;
    let playedGamesA = score.winner
      ? awayStanding.playedGames + 1
      : awayStanding.playedGames;
    let winAway =
      score.winner === "AWAY_TEAM"
        ? awayStanding.winAway + 1
        : awayStanding.winAway;

    let goalsForA = goalsAT + awayStanding.goalsFor;
    let goalsAgainstA = goalsHT + awayStanding.goalsAgainst;
    let goalDifferenceA = goalsForA - goalsAgainstA;

    let goalsForAway = goalsAT + awayStanding.goalsForAway;
    let pointsAway =
      score.winner === "AWAY_TEAM"
        ? awayStanding.pointsAway + 3
        : score.winner === "DRAW"
        ? awayStanding.pointsAway + 1
        : awayStanding.pointsAway;

    // Home matches & Away matches
    let arrHM = homeStanding.homeMatches ? homeStanding.homeMatches : [];
    let arrAM = awayStanding.awayMatches ? awayStanding.awayMatches : [];
    if (action === "insert") {
      arrHM.push(historyMatches);
      arrAM.push(historyMatches);
    } else {
      let keyHM = arrHM.findIndex(({ mid }) => mid === match.id);
      if (keyHM > -1) {
        arrHM[keyHM] = historyMatches;
      }

      let keyAM = arrAM.findIndex(({ mid }) => mid === match.id);
      if (keyAM > -1) {
        arrAM[keyAM] = historyMatches;
      }
    }

    // lastMatches & nextMatches Away
    let arrLastMA = awayStanding.lastMatches ? awayStanding.lastMatches : [];
    let arrNextMA = awayStanding.nextMatches ? awayStanding.nextMatches : [];

    if (score.winner) {
      arrLastMA.push(historyMatches);

      let keyNextM = arrNextMA.findIndex(({ mid }) => mid === match.id);
      if (keyNextM > -1) {
        arrNextMA.splice(keyNextM, 1);
      }
    } else {
      if (action === "insert") {
        arrNextMA.push(historyMatches);
      }
    }
    strapi.services.standing.update(queryHome, {
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
      homeMatches: arrHM,
      lastMatches: arrLastMH,
      nextMatches: arrNextMH,
    });
    strapi.services.standing.update(queryAway, {
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
      awayMatches: arrAM,
      lastMatches: arrLastMA,
      nextMatches: arrNextMA,
    });
  }
  strapi.services.standing.update(
    { sid },
    {
      totalMatches,
      drawMatches,
      pastMatches,
      nextMatches,
      lastMatches,
    }
  );
  if (arrMatches.length > 0) {
    insertManyMatch(arrMatches);
  }
};

const insertManyMatch = (matches) => {
  for (const match of matches) {
    strapi.services.match.create(match);
  }
};

const updateStandingScores = async (ctx) => {
  try {
    let { cid, year, action } = ctx.query;
    let competitionFound = await strapi.services.competition.findOne({ cid });
    if (!cid) {
      return ctx.send({
        message: "missing cid field",
        status: 422,
      });
    }
    await getMatches(competitionFound, year, action);
    ctx.send({
      message: "update standing scores success",
      status: 200,
    });
  } catch (error) {
    console.error(error);
  }
};

const refreshStandings = async (sid) => {
  try {
    let data = {
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
      winHome: 0,
      winAway: 0,
      lastMatchs: [],
      nextMatchs: [],
      awayMatchs: [],
      homeMatchs: [],
    };

    await strapi.services.standing.update({ sid }, { data });
  } catch (error) {
    console.error(error);
  }
};

// const getTeamScores = async (isHome, team, match) => {
//   try {
//     const { score, mid, homeTeam, awayTeam, sid } = match;
//     const win = isHome ? "HOME_TEAM" : "AWAY_TEAM";
//     const lose = isHome ? "AWAY_TEAM" : "HOME_TEAM";
//     let pointsTeam =
//       score.winner === win
//         ? team.points + 3
//         : score.winner === "DRAW"
//         ? team.points + 1
//         : team.points;

//     let won = score.winner === win ? team.won + 1 : team.won;
//     let draw = score.winner === "DRAW" ? team.draw + 1 : team.draw;
//     let lost = score.winner === lose ? team.lost + 1 : team.lost;
//     let playedGamesTeam = team.playedGames + 1;

//     const teamScores = isHome
//       ? score.fullTime.homeTeam
//       : score.fullTime.awayTeam;
//     const otherScores = isHome
//       ? score.fullTime.awayTeam
//       : score.fullTime.homeTeam;
//     let goalsForTeam = teamScores + team.goalsFor;
//     let goalsAgainstTeam = otherScores + team.goalsAgainst;
//     let goalsDifferenceTeam = goalsForTeam - goalsAgainstTeam;
//     const teamGoalsFor = isHome ? team.goalsForHome : team.goalsForAway;

//     let lastTeamMatches = team.lastMatches ? team.lastMatches : [];
//     let nextMatches = team.nextMatches ? team.nextMatches : [];

//     if (isHome) {
//       let goalsForHome = teamScores + teamGoalsFor;
//       let pointsForHome =
//         score.winner === win
//           ? team.pointsHome + 3
//           : score.winner === "DRAW"
//           ? team.pointsHome + 1
//           : team.pointsHome;

//       let arrHomeMatches = team.homeMatches ? team.homeMatches : [];
//       arrHomeMatches.push({
//         mid,
//         homeTeam,
//         awayTeam,
//       });

//       strapi.services.standing.update(
//         {
//           tid: homeTeam.tid,
//           sid,
//         },
//         {
//           playedGames: playedGamesTeam,
//           won: won,
//           draw: draw,
//           lost: lost,
//           points: pointsTeam,
//           goalsFor: goalsForTeam,
//           goalsAgainst: goalsAgainstTeam,
//           goalDifference: goalsDifferenceTeam,
//           goalsForHome,
//           pointsHome: pointsForHome,
//           homeMatches: arrHomeMatches,
//           lastMatches: lastTeamMatches,
//         }
//       );
//     } else {
//       let goalsForAway = score.fullTime.awayTeam + team.goalsForAway;
//       let pointsForAway =
//         score.winner === win
//           ? team.pointsAway + 3
//           : score.winner === "DRAW"
//           ? team.pointsAway + 1
//           : team.pointsAway;

//       let arrAwayMatches = team.awayMatches ? team.awayMatches : [];
//       arrAwayMatches.push({
//         mid,
//         homeTeam,
//         awayTeam,
//       });

//       strapi.services.standing.update(
//         {
//           tid: awayTeam.tid,
//           sid,
//         },
//         {
//           playedGames: playedGamesTeam,
//           won: won,
//           draw: draw,
//           lost: lost,
//           points: pointsTeam,
//           goalsFor: goalsForTeam,
//           goalsAgainst: goalsAgainstTeam,
//           goalDifference: goalsDifferenceTeam,
//           goalsForAway,
//           pointsHome: pointsForAway,
//           awayMatches: arrAwayMatches,
//           lastMatches: lastTeamMatches,
//         }
//       );
//     }
//   } catch (error) {
//     console.error(error);
//   }
// };

module.exports = {
  sync,
  updateStandingScores,
};
