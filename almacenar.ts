import { v4 } from "uuid";
import AWS from "aws-sdk";
import { APIGatewayProxyResult } from "aws-lambda";

interface IBody {
  firstName: string;
  lastname: string;
  email: string;
  id?: string;
}
interface IResponse {
  message: string;
  data?: any;
  error?: any;
}
export const registrar = async (event) => {
  const { firstName, lastname, email }: IBody = JSON.parse(event.body);

  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const table = "Users";
    const payload: IBody = { id: v4(), firstName, lastname, email };
    await dynamoDB.put({ TableName: table, Item: payload }).promise();

    const responseBody: IResponse = {
      message: "Recurso insertado",
      data: payload,
    };
    const response: APIGatewayProxyResult = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };

    return response;
  } catch (error) {
    const responseBody: IResponse = {
      message: error?.message || "Ocurrió un error inesperado",
      error: error?.stack,
    };

    const response: APIGatewayProxyResult = {
      statusCode: 500,
      body: JSON.stringify(responseBody),
    };

    return response;
  }
};
