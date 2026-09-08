import {describe,it,expect} from 'vitest';
import {adminRoleForUser} from './profiles';
describe('administrator role authority',()=>{
 it('does not trust editable profile metadata',()=>{expect(adminRoleForUser({app_metadata:{},user_metadata:{admin_role:'admin',role:'admin'}})).toBeUndefined();});
 it('uses server-managed permissions including revoked access',()=>{expect(adminRoleForUser({app_metadata:{admin_role:'denied'},user_metadata:{admin_role:'admin'}})).toBe('denied');});
});
