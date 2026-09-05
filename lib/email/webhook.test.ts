import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyWebhook } from './webhook';
test('Svix reference signature verifies; tampering and stale requests fail',()=>{
 const body='{"event_type":"ping","data":{"success":true}}';const headers=new Headers({'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='});const secret='whsec_plJ3nmyCDGBKInavdOK15jsl';
 assert.equal(verifyWebhook(body,headers,secret,1731705121000),'msg_loFOjxBNrRLzqYUf');assert.throws(()=>verifyWebhook(body+' ',headers,secret,1731705121000));assert.throws(()=>verifyWebhook(body,headers,secret,1731706000000));
});
