const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");

const sync= async (ctx) => {
  const { plan } = ctx.query;
  const res = await axios.get(
    `${process.env.FB_URL}/competitions?plan=${plan}`,
    {
      headers: fbHeader,
    }
  );
  const { competitions } = res.data;
  await Promise.all(
    data.map(async ({ id, name, code, plan, img, currentSeason, arid }) => {
      const area = await strapi.services.area.findOne({ aid: arid });
      const competition = await strapi.services.competition.findOne({
        cid: id,
      });
      if (!competition) {
        await strapi.services.competition.create({
          cid: id,
          name_en: name,
          code_en: code,
          plan,
          img,
          area,
        });
      }
    })
  );

  ctx.send({
    message: "sync competition success",
    status: 200,
    data: competitions,
  });
};
module.exports = {
  sync
};
