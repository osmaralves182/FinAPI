const express = require('express');
const { v4: uuidv4 } = require("uuid")

const app = express();

app.use(express.json());

const customers = [];

// Middleware
function vefifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: "Customer not found!" });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) =>
    operation.type === 'credit'
      ? acc + operation.amount
      : acc - operation.amount
    , 0)

  return balance
}

/*
cpf - string
name - string
id - uuid
statement (extrato, lançamentos) - [] 
*/

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists!" });
  }

  //const id = uuidv4(); // comentado por que vai ser criado na chamada do push

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  });

  return response.status(201).send();

})

// este método recebe o cpf pelo query params, foi implementada recebendo pelo header
/*app.get("/statement/:cpf", (request, response) => {
  const { cpf } = request.params;

  const customer = customers.find(customer => customer.cpf === cpf);

  if(!customer){
    return response.status(400).json({ error: "Customer not found!" });
  }

  return response.json(customer.statement);
})*/

app.get("/statement", vefifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
})

app.get("/statement/date", vefifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  return response.json(statement);
})

app.post("/deposit", vefifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
})

app.post("/withdraw", vefifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient founds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
})

app.put("/account", vefifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).send();

})

app.get("/account", vefifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
})

app.delete("/account", vefifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  // splice
  customers.splice(customer, 1);

  return response.status(200).json(customers);
})

app.get("/balance", vefifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
})

app.listen(3333);