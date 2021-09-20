const fs = require("fs");
const path = require("path");

module.exports = {
  async sync(ctx) {
    const file = path.join(__dirname, "../../data/competitions.json");
    let rawdata = fs.readFileSync(file);
    let data = JSON.parse(rawdata);
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
  },
};
