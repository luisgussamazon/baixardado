import {test} from "node:test";
import assert from "node:assert/strict";
import {CloudAIError} from "../lib/ai-provider";
import {EngineeringFailure,providerEngineeringFailure,safeEngineeringFailure} from "../lib/engineering-errors";

test("engineering failures expose only fixed messages and distinguish provider rejection",()=>{
 for(const [status,code] of [[400,"AI_REQUEST"],[401,"AI_AUTH"],[403,"AI_ACCESS"],[404,"AI_MODEL"],[422,"AI_REQUEST"],[429,"AI_LIMIT"],[503,"AI_UNAVAILABLE"]] as const)assert.equal(providerEngineeringFailure(status).code,code);
 assert.equal(safeEngineeringFailure(new Error("Invalid plan")).code,"PLAN_FORMAT");
 assert.equal(safeEngineeringFailure(new SyntaxError("private model response")).code,"PLAN_FORMAT");
 assert.equal(safeEngineeringFailure(new Error("Task lease unavailable")).code,"TASK_LEASE");
 assert.equal(safeEngineeringFailure(new CloudAIError("Teto mensal da API atingido.",429)).code,"LOCAL_BUDGET");
 assert.equal(safeEngineeringFailure(new DOMException("private timeout detail","TimeoutError")).code,"AI_TIMEOUT");
 assert.equal(safeEngineeringFailure(new EngineeringFailure("PLAN_TOOLS")).code,"PLAN_TOOLS");
 const failure=safeEngineeringFailure(new Error("password=fixture-private-value private@example.test"));
 assert.equal(failure.code,"ENGINEERING_UNKNOWN");assert.doesNotMatch(failure.message,/fixture|private@example|password/);
 assert.equal(safeEngineeringFailure(new Error("toString")).code,"ENGINEERING_UNKNOWN");
});
