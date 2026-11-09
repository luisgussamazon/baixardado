import {test} from "node:test";
import assert from "node:assert/strict";
import {calculateReorderPoint} from "../lib/experiments/calculate-stock-replacement";

test("reposição cobre demanda durante o prazo mais reserva, sem arredondar unidades",()=>{
  assert.equal(calculateReorderPoint(10,3,5),35);
  assert.equal(calculateReorderPoint(12,7,20),104);
  assert.equal(calculateReorderPoint(2.5,1.5,0.25),4);
  assert.equal(calculateReorderPoint(10,3),30);
  assert.equal(calculateReorderPoint(0,7,12),12);
  assert.equal(calculateReorderPoint(10,0,12),12);
  assert.equal(calculateReorderPoint(0,0,0),0);
});

test("reposição rejeita valores não finitos, negativos, tipos indevidos e overflow",()=>{
  for(const invalid of [NaN,Infinity,-Infinity,-1,"10",null,undefined,{},true]){
    for(let index=0;index<3;index++){
      const args:unknown[]=[10,3,5];args[index]=invalid;
      // undefined na reserva opcional equivale ao argumento omitido.
      assert.equal(calculateReorderPoint(...args as [number,number,number]),index===2&&invalid===undefined?30:null);
    }
  }
  assert.equal(calculateReorderPoint(Number.MAX_VALUE,2,0),null);
  assert.equal(calculateReorderPoint(Number.MAX_VALUE,1,Number.MAX_VALUE),null);
});

test("aumentar demanda, prazo ou reserva nunca reduz o ponto calculado",()=>{
  for(let demand=0;demand<=10;demand++)for(let days=0;days<=10;days++){
    const base=calculateReorderPoint(demand,days,4)!;
    assert.ok(calculateReorderPoint(demand+1,days,4)!>=base);
    assert.ok(calculateReorderPoint(demand,days+1,4)!>=base);
    assert.ok(calculateReorderPoint(demand,days,5)!>=base);
    assert.ok(base>=4);
  }
});
