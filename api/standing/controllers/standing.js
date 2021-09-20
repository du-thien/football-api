const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");
const fs = require("fs");
const path = require("path");

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
      let standingList = [];
      const comp = await strapi.services.competition.findOne({
        cid: competition.id,
      });

      if (teams.length > 0) {
        standingList = await Promise.all(
          teams.map(async (team) => {
            const existStanding = await strapi.services.standing.findOne({
              sid: season.id,
              tid: team.id,
            });
            if (existStanding) return existStanding;
            return await strapi.services.standing.create({
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
        `${process.env.FB_URL}/competitions/${cid}/matches?seasons=${year}`,
        {
          headers: fbHeader,
        }
      );

      const { matches } = res.data;
      if (matches.length > 0) {
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
            const { score, id } = match;
            let pointsH =
              score.winner === "HOME_TEAM"
                ? home.points + 3
                : score.winner === "DRAW"
                ? home.points + 1
                : home.points;

            let wonH = score.winner === "HOME_TEAM" ? home.won + 1 : home.won;
            let drawH = score.winner === "DRAW" ? home.draw + 1 : home.draw;
            let lostH =
              score.winner === "AWAY_TEAM" ? home.lost + 1 : home.lost;
            let playedGamesH = home.playedGames + 1;

            let goalsForH = score.fullTime.homeTeam + home.goalsFor;
            let goalsAgainstH = score.fullTime.awayTeam + home.goalsAgainst;
            let goalDifferenceH = goalsForH - goalsAgainstH;

            let goalsForHome = score.fullTime.homeTeam + home.goalsForHome;
            let pointsHome =
              score.winner === "HOME_TEAM"
                ? home.pointsHome + 3
                : score.winner === "DRAW"
                ? home.pointsHome + 1
                : home.pointsHome;

            let arrHomeMatches = home.homeMatches ? home.homeMatches : [];
            arrHomeMatches.push({
              id,
              homeTeam,
              awayTeam,
            });

            let lastHomeMatches = home.lastMatches ? home.lastMatches : [];
            lastHomeMatches.push({
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
                homeMatches: arrHomeMatches,
                lastMatches: lastHomeMatches,
              }
            );

            // Away
            let pointsA =
              score.winner === "AWAY_TEAM"
                ? away.points + 3
                : score.winner === "DRAW"
                ? away.points + 1
                : away.points;
            let wonA = score.winner === "AWAY_TEAM" ? away.won + 1 : away.won;
            let drawA = score.winner === "DRAW" ? away.draw + 1 : away.draw;
            let lostA =
              score.winner === "HOME_TEAM" ? away.lost + 1 : away.lost;
            let playedGamesA = away.playedGames + 1;

            let goalsForA = score.fullTime.awayTeam + away.goalsFor;
            let goalsAgainstA = score.fullTime.homeTeam + away.goalsAgainst;
            let goalDifferenceA = goalsForA - goalsAgainstA;

            let goalsForAway = score.fullTime.awayTeam + away.goalsForAway;
            let pointsAway =
              score.winner === "AWAY_TEAM"
                ? away.pointsAway + 3
                : score.winner === "DRAW"
                ? away.pointsAway + 1
                : away.pointsAway;

            let arrAwaysMatches = away.homeMatches ? away.homeMatches : [];
            arrAwaysMatches.push({
              id,
              homeTeam,
              awayTeam,
            });

            let lastAwaysMatches = away.lastMatches ? away.lastMatches : [];
            lastAwaysMatches.push({
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
                awayMatches: arrAwaysMatches,
                lastMatches: lastAwaysMatches,
              }
            );
          }
        }
      }
      ctx.send({
        message: "update standing scores success",
        status: 200,
      });
    } catch (error) {
      console.log(error);
    }
  },
};
