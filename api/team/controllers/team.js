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
      const { teams } = res.data;
      let count = 0;
      let length = teams.length;
      for (const team of teams) {
        const {
          id,
          area,
          name,
          shortName,
          tla,
          website,
          venue,
          address,
          clubColors,
          crestUrl,
        } = team;

        let teamExisted = await strapi.services.team.findOne({
          tid: id,
        });

        const areaExisted = await strapi.services.area.findOne({ aid: area.id });
        if (!teamExisted) {
          await strapi.services.team.create({
            tid: id,
            website,
            name,
            shortName,
            tla,
            venue,
            address,
            clubColors,
            crestUrl,
            area: areaExisted,
          });
          count++;
          console.log(`created (${count}/${length}) - team id: ${id}`);
        } else {
          length--;
        }
      }

      ctx.send({
        message: "sync teams success",
        status: 200,
      });
    } catch (error) {
      console.error(error);
    }
  },
};
