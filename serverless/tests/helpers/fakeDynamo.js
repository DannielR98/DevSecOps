// Minimal in-memory stand-in for DynamoDBDocumentClient covering the commands
// used by src/lib/repo.js. It is not a full DynamoDB emulator: it does not
// model pagination, unprocessed batches, index consistency or every condition.
const KEYS = {
  users: "user_id",
  uniques: "pk",
};

export const createFakeDynamo = (tables) => {
  const data = {};
  const tableAlias = (name) =>
    Object.entries(tables).find(([, value]) => value === name)?.[0];
  const keyOf = (TableName) => KEYS[tableAlias(TableName)] ?? "id";

  const rows = (name) => (data[name] ??= new Map());

  // Only the existence checks used by these lifecycle tests are implemented.
  const conditionFails = (expr, item) => {
    if (!expr) return false;
    if (expr.startsWith("attribute_not_exists")) return item !== undefined;
    if (expr.startsWith("attribute_exists")) return item === undefined;
    throw new Error(`Unsupported condition: ${expr}`);
  };

  const failure = (name) => {
    const error = new Error("conditional check failed");
    error.name = name;
    return error;
  };

  const put = ({ TableName, Item, ConditionExpression }) => {
    const key = Item[keyOf(TableName)];
    if (conditionFails(ConditionExpression, rows(TableName).get(key))) {
      throw failure("ConditionalCheckFailedException");
    }
    rows(TableName).set(key, structuredClone(Item));
  };

  const remove = ({ TableName, Key }) => {
    rows(TableName).delete(Object.values(Key)[0]);
  };

  // Approximate the repository's equality queries and creation-time ordering.
  const query = ({ TableName, KeyConditionExpression, ExpressionAttributeValues, ScanIndexForward }) => {
    const [, attr, placeholder] = KeyConditionExpression.match(/(\w+) = (:\w+)/);
    const items = [...rows(TableName).values()].filter(
      (item) => item[attr] === ExpressionAttributeValues[placeholder],
    );
    items.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    if (ScanIndexForward === false) items.reverse();
    return { Items: structuredClone(items) };
  };

  const send = async (command) => {
    const input = command.input;
    switch (command.constructor.name) {
      case "GetCommand": {
        const item = rows(input.TableName).get(Object.values(input.Key)[0]);
        return { Item: item ? structuredClone(item) : undefined };
      }
      case "PutCommand":
        put(input);
        return {};
      case "DeleteCommand":
        remove(input);
        return {};
      case "QueryCommand":
        return query(input);
      case "ScanCommand":
        return { Items: structuredClone([...rows(input.TableName).values()]) };
      case "UpdateCommand": {
        const item = rows(input.TableName).get(Object.values(input.Key)[0]);
        if (conditionFails(input.ConditionExpression, item)) {
          throw failure("ConditionalCheckFailedException");
        }
        const [, name] = input.UpdateExpression.match(/SET (#\w+) = /);
        item[input.ExpressionAttributeNames[name]] = Object.values(
          input.ExpressionAttributeValues,
        )[0];
        return { Attributes: structuredClone(item) };
      }
      case "BatchGetCommand": {
        const [[TableName, { Keys }]] = Object.entries(input.RequestItems);
        const found = Keys.map((key) => rows(TableName).get(Object.values(key)[0])).filter(
          Boolean,
        );
        return { Responses: { [TableName]: structuredClone(found) } };
      }
      case "BatchWriteCommand": {
        for (const [TableName, requests] of Object.entries(input.RequestItems)) {
          requests.forEach((r) => remove({ TableName, Key: r.DeleteRequest.Key }));
        }
        return {};
      }
      case "TransactWriteCommand": {
        // Check supported put conditions before applying any transaction writes.
        for (const { Put } of input.TransactItems) {
          if (
            Put &&
            conditionFails(
              Put.ConditionExpression,
              rows(Put.TableName).get(Put.Item[keyOf(Put.TableName)]),
            )
          ) {
            throw failure("TransactionCanceledException");
          }
        }
        for (const op of input.TransactItems) {
          if (op.Put) put({ ...op.Put, ConditionExpression: undefined });
          if (op.Delete) remove(op.Delete);
        }
        return {};
      }
      default:
        throw new Error(`Unsupported command ${command.constructor.name}`);
    }
  };

  return { doc: { send }, data };
};
