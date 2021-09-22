const fs = require("fs");
const path = require("path");

const sync = async (ctx) => {
  const file = path.join(__dirname, "../../data/seasons.json");
  let rawdata = fs.readFileSync(file);
  let data = JSON.parse(rawdata);
  
  const seasons = await Promise.all(
    data.map(
      async ({
        id,
        cid,
        name_en,
        name_vi,
        code_en,
        code_vi,
        startDate,
        endDate,
        currentMatchday,
        winner,
      }) => {
        const competition = await strapi.services.competition.findOne({
          cid,
        });
        console.log(winner)
        const team = await strapi.services.team.findOne({
          tid: winner,
        });

        return await strapi.services.season.create({
          sid: id,
          name_en,
          name_vi,
          code_en,
          code_vi,
          startDate,
          endDate,
          currentMatchday,
          winner: team,
          competition,
        });
      }
    )
  );

  console.log(seasons);
  ctx.send({
    message: "sync seasons success",
    status: 200,
  });
};
module.exports = {
  sync
};
