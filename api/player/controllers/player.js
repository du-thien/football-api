const fs = require("fs");
const path = require("path");

module.exports = {
  async sync(ctx) {
    const file = path.join(__dirname, "../../data/players.json");
    let rawdata = fs.readFileSync(file);
    let data = JSON.parse(rawdata);

    const players = await Promise.all(
      data.map(
        async ({
          id,
          tid,
          name,
          firstName,
          position,
          dateOfBirth,
          countryOfBirth,
          nationality,
          img,
          shirtNumber,
          role,
        }) => {
          const team = await strapi.services.team.findOne({ tid: tid });
          return await strapi.services.player.create({
            pid: id,
            team,
            name,
            firstName,
            position,
            dateOfBirth,
            countryOfBirth,
            nationality,
            photo: img,
            shirtNumber,
            role,
          });
        }
      )
    );

    console.log(players);
    ctx.send({
      message: "sync players success",
      status: 200,
    });
  },
};
