jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AsyncStorageMedicationStore} from '../src/services/AsyncStorageMedicationStore';
import {MedicationSchedulingEngine,mapApiPrescription,parseFrequency,generateSchedules} from '../src/services/MedicationSchedulingEngine';
const now=new Date('2099-01-01T00:00:00+05:30');
const raw={id:'freq-rx',patientId:'p',medicines:[{id:'med-entry',medicineid:'med',drug:'Test medicine',frequency:'1',frequencyNote:'1-1-1',qty:9,duration:3,startDate:'2099-01-01'}]};
beforeEach(async()=>{await AsyncStorage.clear();});
test('HIS frequencyNote overrides a frequency identifier and generates three doses each day',async()=>{
 const rx=mapApiPrescription(raw);expect(rx.medicines[0].frequency).toBe('1-1-1');
 const store=new AsyncStorageMedicationStore(),notifications={schedule:jest.fn(),cancel:jest.fn()};
 const engine=new MedicationSchedulingEngine({store,notificationManager:notifications});
 await engine.syncPrescription(rx,{now});
 const doses=await store.listSchedules();expect(doses).toHaveLength(9);
 for(const date of ['2099-01-01','2099-01-02','2099-01-03']) {
  expect(doses.filter(s=>s.scheduledDate===date).map(s=>s.slot)).toEqual(['MORNING','AFTERNOON','NIGHT']);
 }
 expect(await store.listAlarms()).toHaveLength(9);
 await engine.syncPrescription(rx,{now});expect(await store.listSchedules()).toHaveLength(9);
});
test.each([['1-0-1',[1,1]],['0-1-0',[1]],['1-1-1-1',[1,1,1,1]],['0.5-0-0.5',[0.5,0.5]],['1 \u2013 1 \u2013 1',[1,1,1]],['3',[1,1,1]]])('preserves active dose quantities for %s',(frequency,expected)=>{
 expect(parseFrequency(frequency).filter(s=>s.dose>0).map(s=>s.dose)).toEqual(expected);
});
test('regeneration restores doses cancelled by an earlier incorrect frequency',async()=>{
 const store=new AsyncStorageMedicationStore(),engine=new MedicationSchedulingEngine({store});
 const correct=mapApiPrescription(raw);
 await engine.syncPrescription(correct,{now});
 const old=mapApiPrescription({...raw,medicines:[{...raw.medicines[0],frequencyNote:'1-0-0'}]});
 await engine.syncPrescription(old,{now});
 expect((await store.listSchedules()).some(s=>s.slot==='AFTERNOON'&&s.status==='CANCELLED')).toBe(true);
 await engine.syncPrescription(correct,{now});
 expect((await store.listSchedules()).filter(s=>s.scheduledDate==='2099-01-01'&&s.status==='SCHEDULED').map(s=>s.slot)).toEqual(['MORNING','AFTERNOON','NIGHT']);
 expect((await store.listAlarms()).filter(a=>a.status==='SCHEDULED')).toHaveLength(9);
});
test('the last partial day still respects the prescribed quantity',()=>{
 const medicine=mapApiPrescription({...raw,medicines:[{...raw.medicines[0],qty:4}]}).medicines[0];
 const doses=generateSchedules(medicine,{now});
 expect(doses.filter(s=>s.scheduledDate==='2099-01-01')).toHaveLength(3);
 expect(doses.reduce((n,s)=>n+s.doseQuantity,0)).toBe(4);
});

const hisDosePayload={id:'123291',lastmodified:'2026-10-12 13:51:54',is_visible:false,_doctorPractid:1849,medicines:[{id:8828,drug:'KSPRO F10 TAB',dose:'1-1-1',frequencyNote:'',duration:'4',priscdurationtype:null,routes:'RURAL',mdicineid:'9190',sqno:'0',remark:'',dddose:null,qty:'12.0',genericname:'GEN',dosage:'0.00',type:'',medicineDose:'0',strength:'0',medicineid:'9190',catalogueid:'9190',calculatedDose:null}],medicineCount:1};
test('actual KSPRO HIS payload maps dose pattern to three doses and alarms for all four days',async()=>{
 const rx=mapApiPrescription(hisDosePayload),store=new AsyncStorageMedicationStore();
 expect(rx.medicines[0].frequency).toBe('1-1-1');
 expect(rx.medicines[0].prescribedQuantity).toBe(12);
 const engine=new MedicationSchedulingEngine({store});
 await engine.syncPrescription(rx,{now:new Date('2026-10-12T00:00:00+05:30')});
 const schedules=await store.listSchedules();expect(schedules).toHaveLength(12);
 for(const date of ['2026-10-12','2026-10-13','2026-10-14','2026-10-15']) {
  const doses=schedules.filter(s=>s.scheduledDate===date);
  expect(doses.map(s=>s.slot)).toEqual(['MORNING','AFTERNOON','NIGHT']);
  expect(doses.map(s=>s.doseQuantity)).toEqual([1,1,1]);
 }
 expect((await store.listAlarms()).filter(a=>a.status==='SCHEDULED')).toHaveLength(12);
});
test('actual payload replaces earlier fallback morning/night schedules on resync',async()=>{
 const store=new AsyncStorageMedicationStore(),engine=new MedicationSchedulingEngine({store}),instant=new Date('2026-10-12T00:00:00+05:30');
 const wrong=mapApiPrescription(hisDosePayload);wrong.medicines[0].frequency='1-0-1';
 await engine.syncPrescription(wrong,{now:instant});
 expect((await store.listSchedules()).filter(s=>s.slot==='AFTERNOON')).toHaveLength(0);
 await engine.syncPrescription(mapApiPrescription(hisDosePayload),{now:instant});
 expect((await store.listSchedules()).filter(s=>s.slot==='AFTERNOON'&&s.status==='SCHEDULED')).toHaveLength(4);
 expect((await store.listAlarms()).filter(a=>a.status==='SCHEDULED')).toHaveLength(12);
});
test('dose strengths do not override a genuine frequency',()=>{
 const rx=mapApiPrescription({...hisDosePayload,medicines:[{...hisDosePayload.medicines[0],dose:'500 mg',frequency:'BD'}]});
 expect(rx.medicines[0].frequency).toBe('BD');
});
