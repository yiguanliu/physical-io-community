import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commandSchema,isAdmin} from './contracts';
test('authorization only accepts the established server-managed admin role',()=>{
 assert.equal(isAdmin(null),false);assert.equal(isAdmin({app_metadata:{}}),false);assert.equal(isAdmin({app_metadata:{outreach_access:true}}),false);assert.equal(isAdmin({app_metadata:{admin_role:'member'}}),false);assert.equal(isAdmin({app_metadata:{admin_role:'admin'}}),true);
});
test('member validation normalizes email and rejects invalid status or empty identity',()=>{
 const input={action:'member.save',name:' Alex ',email:'ALEX@example.com',city:'London',role:'Engineer',status:'Active',topics:['Robotics']};
 const parsed=commandSchema.parse(input);assert.equal('email' in parsed&&parsed.email,'alex@example.com');
 for(const patch of [{name:''},{email:'bad'},{status:'admin'},{topics:['']},{id:'not-an-id'}])assert.equal(commandSchema.safeParse({...input,...patch}).success,false);
});
test('drafts cannot use arbitrary recipients or gain a sent status',()=>{
 assert.equal(commandSchema.safeParse({action:'campaign.save',name:'Hello',body:'Message',audience:'person@example.com'}).success,false);
 const c=commandSchema.parse({action:'campaign.save',name:'Hello',body:'Message',audience:'All opted-in',status:'sent'});assert.equal('status' in c,false);
});
test('bulk actions and events reject invalid input',()=>{
 assert.equal(commandSchema.safeParse({action:'member.activate',ids:[]}).success,false);
 assert.equal(commandSchema.safeParse({action:'event.save',name:'Launch',date:'not a date',location:'London',description:''}).success,false);
 assert.equal(commandSchema.safeParse({action:'lead.save',company:'Company',contact:'Contact',email:'',role:'',stage:'Research',value:'-1',next:''}).success,false);
});
