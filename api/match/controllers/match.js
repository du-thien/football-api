const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");
const moment = require("moment");

module.exports = {
  async sync(ctx) {
    try {
      const { cid, year } = ctx.query;
      const res = await axios.get(
        `${process.env.FB_URL}/competitions/${cid}/matches?season=${year}&status=FINISHED`,
        {
          headers: fbHeader,
        }
      );
      const { matches } = res.data;

      if (matches.length > 0) {
        return await Promise.all(
          matches.map(async (match) => {
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

            const home = await strapi.services.team.findOne({
              tid: homeTeam.id,
            });
            const away = await strapi.services.team.findOne({
              tid: awayTeam.id,
            });

            return await strapi.services.match.create({
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
          })
        );
      }
      ctx.send({
        message: "sync matches success",
        status: 200,
      });
    } catch (error) {
      console.log(error);
    }
  },
};
