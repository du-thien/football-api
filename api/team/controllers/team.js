const fs = require("fs");
const path = require("path");

module.exports = {
  async sync(ctx) {
    const file = path.join(__dirname, "../../data/teams.json");
    let rawdata = fs.readFileSync(file);
    let data = JSON.parse(rawdata);

    const teams = await Promise.all(
      data.map(
        async ({
          id,
          name,
          shortName,
          tla,
          venue,
          address,
          clubColors,
          img,
          website,
          arid,
        }) => {
          const area = await strapi.services.area.findOne({ aid: arid });
          return await strapi.services.team.create({
            tid: id,
            website,
            name,
            shortName,
            tla,
            venue,
            address,
            clubColors,
            crestUrl: img,
            area,
          });
        }
      )
    );

    console.log(teams);
    ctx.send({
      message: "sync teams success",
      status: 200,
    });
  },
};
