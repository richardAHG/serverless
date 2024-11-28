const http = require("axios");
listar = async (event) => {
  const request = await http.get("https://jsonplaceholder.typicode.com/posts");
  const data = request.data;
  return {
    statusCode: 200,
    body: JSON.stringify({
      data,
      message: "listado",
    }),
  };
};

module.exports = { listar };
