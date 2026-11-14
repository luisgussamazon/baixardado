import {test,mock} from "node:test";
import assert from "node:assert/strict";
import {db} from "../lib/db";
import {dispatchEngineering} from "../lib/engineering-dispatch";

test("dispatch is fixed-scope, owner-checked, throttled and never retries uncertain requests",async()=>{
 const backup=process.env.A3X_GITHUB_ACTIONS_TOKEN;let owner=true,recent=false,released=false,calls=0,status=204,fail=false;
 mock.method(db,"connect",async()=>({query:async(sql:string,params?:unknown[])=>{
  if(sql.startsWith("BEGIN"))released=false;
  if(sql.includes("SELECT status")){assert.deepEqual(params,["task-fixture","owner-fixture"]);return {rows:owner?[{status:"queued"}]:[]};}
  if(sql.includes("SELECT 1"))return {rows:recent?[{}]:[]};
  return {rows:[]};
 },release(){released=true;}}));
 mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{
  calls++;assert.equal(released,true,"No DB transaction is held while contacting GitHub");
  assert.equal(url,"https://api.github.com/repos/luisgussamazon/baixardado/actions/workflows/a3x-engineering.yml/dispatches");
  assert.deepEqual(JSON.parse(String(init?.body)),{ref:"main"});assert.equal(init?.redirect,"error");
  assert.equal((init?.headers as Record<string,string>).Authorization,"Bearer fixture-only");
  if(fail)throw Error("private provider response must not leak");return new Response(null,{status});
 });
 try{
  delete process.env.A3X_GITHUB_ACTIONS_TOKEN;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"unconfigured");assert.equal(calls,0);
  process.env.A3X_GITHUB_ACTIONS_TOKEN="fixture-only";owner=false;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"not-queued");assert.equal(calls,0);
  owner=true;recent=true;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"cooldown");assert.equal(calls,0);
  recent=false;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"requested");assert.equal(calls,1);
  status=200;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"requested");assert.equal(calls,2);
  status=403;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"unavailable");assert.equal(calls,3);
  fail=true;assert.equal(await dispatchEngineering("task-fixture","owner-fixture"),"unavailable");assert.equal(calls,4,"One attempt only, no uncertain POST retry");
 }finally{mock.restoreAll();if(backup===undefined)delete process.env.A3X_GITHUB_ACTIONS_TOKEN;else process.env.A3X_GITHUB_ACTIONS_TOKEN=backup;}
});
