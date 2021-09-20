const fs = require("fs");
const path = require("path");

module.exports = {
  async sync(ctx) {
    const file = path.join(__dirname, "../../data/competitions.json");
    let rawdata = fs.readFileSync(file);
    let data = JSON.parse(rawdata);

    const competitions = await Promise.all(
      data.map(async ({ id, name, code, plan, img, currentSeason, arid }) => {
        const area = await strapi.services.area.findOne({ aid: arid });
        return await strapi.services.competition.create({
          cid: id,
          name_en: name,
          code_en: code,
          plan,
          img,
          area,
        });
      })
    );

    console.log(competitions);
    ctx.send({
      message: "sync competition success",
      status: 200,
    });
  },
};
