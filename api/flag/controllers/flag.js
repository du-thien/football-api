const { bongdaHeader } = require("../../constants/headers");
const axios = require("../../plugins/axios");
const { downloadImage } = require("../../utils/downloadImage");
const cheerio = require("cheerio");

module.exports = {
  async download(ctx) {
    await axios
      .get(`${process.env.BONGDA_URL}/bang-xep-hang-bong-da.html`, {
        headers: bongdaHeader,
      })
      .then(async (res) => {
        if (res.status === 200) {
          const $ = cheerio.load(res.data);
          const colNews = $(".New_col-centre");
          let leagues = [];
          colNews.find(".danh_sach_bxh").each((i, el) => {
            const url = $(el).find("a").attr("href");
            const name = $(el).find("a").text().trim();
            console.log(`[GET LEAGUE URL]: ${url}`);
            leagues.push({
              name: name,
              url: url,
            });
          });
          const teams = await getLinksTeam(leagues);
          const imageTeams = await getImagesTeam(teams);
          const response = await downloadFlags(imageTeams);
          if (response.status === 200) {
            console.log("[DOWNLOAD IMAGE COMPLETED]");
          }
          ctx.send({
            message: response.message,
          });
        }
      })
      .catch((err) => console.error(err.message));
  },
};

const getLinksTeam = async (leagues) => {
  const teams = await Promise.all(
    leagues.map(async (league) => {
      return await getTeams(league);
    })
  );
  var filtered = teams.filter((el) => {
    return el != null;
  });
  return filtered;
};

const getTeams = async (league) => {
  const { name, url } = league;
  try {
    const res = await axios.get(url, { headers: bongdaHeader });
    const $ = cheerio.load(res.data);
    const colNews = $("table");
    const teamUrls = [];
    await Promise.all(
      colNews.find(".xanhbxh").each((i, el) => {
        const url = $(el).attr("href");
        console.log(`[GET TEAM URL]: ${url}`);
        teamUrls.push(url);
      })
    );
    return { name: name, urls: teamUrls };
  } catch (error) {
    console.error(error.message);
  }
};

const getImagesTeam = async (teams) => {
  try {
    const imageTeams = await Promise.all(
      teams.map(async (team) => {
        const images = await Promise.all(
          team.urls.map(async (url) => {
            return await getImage(url);
          })
        );
        return {
          name: team.name,
          urls: images,
        };
      })
    );
    var filtered = imageTeams.filter((el) => {
      return el != null;
    });
    return filtered;
  } catch (error) {
    console.error(error.message);
  }
};

const getImage = async (teamUrl) => {
  try {
    const response = await axios.get(`${process.env.BONGDA_URL}${teamUrl}`, {
      headers: bongdaHeader,
    });
    const $ = cheerio.load(response.data);
    const image = $("img.CLB_logo").attr("src");
    console.log(`[GET IMAGE URL]: ${image}`);
    return image;
  } catch (error) {
    console.error(error.message);
  }
};

const downloadFlags = async (imageTeams) => {
  try {
    await Promise.all(
      imageTeams.map(async (team) => {
        if (team.urls.length > 0) {
          await Promise.all(
            team.urls.map(async (url) => {
              if (url) {
                const imagePath = url.replace(
                  "http://static.bongda.wap.vn/team-logo/",
                  ""
                );
                await downloadImage(url, `public/leagues/${imagePath}`);
              }
            })
          );
        }
      })
    );
    return {
      status: 200,
      message: "download completed",
    };
  } catch (error) {
    return {
      status: 400,
      message: `download failed: ${error.message}`,
    };
  }
};
