const http = require("axios");

const httpRequest = async (url) => {
  try {
    const request = await http.get(url);
    return request.data;
  } catch (error) {
    throw new Error(`Error al obtener la data de ${url}, ${error?.message}`);
  }
};

listar = async (event) => {
  const { people_id } = event.pathParameters;

  try {
    const people = await httpRequest(`https://swapi.py4e.com/api/people/${people_id}`);

    if (people?.homeworld) {
      people.planet = await httpRequest(people.homeworld);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: people,
        message: "Datos obtenidos",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.stack,
        message: error?.message || "Ocurrió un error inesperado",
      }),
    };
  }
};

module.exports = { listar };
