const { v4 } = require("uuid");
const AWS = require("aws-sdk");

registrar = async (event) => {
  const { firstName, lastname, email } = JSON.parse(event.body);

  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const table = "Users";
    const payload = { id: v4(), firstName, lastname, email };
    await dynamoDB.put({ TableName: table, Item: payload }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Recurso insertado",
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

module.exports = { registrar };
