import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),release:vi.fn(),deliver:vi.fn()}));
vi.mock('@/lib/email/database',()=>({emailDatabase:()=>({connect:async()=>mocks})}));
vi.mock('./campaign-delivery',()=>({deliverBatch:mocks.deliver}));
import {runCampaignWorker} from './campaign-worker';
beforeEach(()=>vi.resetAllMocks());
it('does not process work concurrently with another worker',async()=>{
 mocks.query.mockResolvedValue({rows:[{locked:false}]});
 expect(await runCampaignWorker()).toEqual({busy:true,batches:0});
 expect(mocks.deliver).not.toHaveBeenCalled();expect(mocks.release).toHaveBeenCalledOnce();
});
it('continues queued work without a browser request',async()=>{
 mocks.query.mockResolvedValueOnce({rows:[{locked:true}]}).mockResolvedValueOnce({rows:[{id:'campaign',actor_user_id:'actor',actor_name:'Admin'}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValue({rows:[]});
 expect(await runCampaignWorker()).toEqual({busy:false,batches:1});
 expect(mocks.deliver).toHaveBeenCalledWith(mocks,expect.objectContaining({id:'campaign',action:'send'}),{id:'actor',name:'Admin'},undefined,undefined,expect.objectContaining({deadline:expect.any(Number)}));
 expect(mocks.release).toHaveBeenCalledOnce();
});
it('releases the worker lock on failure so cron can resume pending work',async()=>{
 mocks.query.mockResolvedValueOnce({rows:[{locked:true}]}).mockResolvedValueOnce({rows:[{id:'campaign'}]}).mockResolvedValue({rows:[]});mocks.deliver.mockRejectedValue(new Error('offline'));
 await expect(runCampaignWorker()).rejects.toThrow('offline');
 expect(mocks.query).toHaveBeenLastCalledWith("select pg_advisory_unlock(hashtext('campaign-worker'))");expect(mocks.release).toHaveBeenCalledOnce();
});
