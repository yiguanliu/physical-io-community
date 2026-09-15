import argparse
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch
import veo

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        (self.root/'frame.png').write_bytes(b'local-test-image')
        self.pack=self.root/'pack.json'
        self.pack.write_text(json.dumps([{'shot':'01','title':'Test','starting_image':'frame.png','prompt':'One disc flips.'}]))
        self.args=argparse.Namespace(pack=str(self.pack),shot='01',model='fast',seconds=4,resolution='720p',aspect='16:9',max_cost_usd=.40,take='01')
    def test_plan_and_resolution_constraint(self):
        self.assertEqual(veo.plan(self.args)['estimated_cost_usd'],.4)
        self.args.resolution='1080p'
        with self.assertRaises(ValueError):veo.plan(self.args)
    def test_insufficient_or_nan_budget_never_connects(self):
        with patch.object(veo,'client') as create:
            for budget in [.1,float('nan')]:
                self.args.max_cost_usd=budget
                with self.assertRaises(ValueError):veo.generate(self.args)
            create.assert_not_called()
    def test_duplicate_take_does_not_submit_again(self):
        api=Mock();api.models.generate_videos.return_value=SimpleNamespace(name='operations/test')
        api.operations.get.return_value=SimpleNamespace(done=False)
        with patch.object(veo,'client',return_value=api):
            veo.generate(self.args);veo.generate(self.args)
        self.assertEqual(api.models.generate_videos.call_count,1)
    def test_ambiguous_submission_is_not_retried(self):
        api=Mock();api.models.generate_videos.side_effect=TimeoutError()
        with patch.object(veo,'client',return_value=api):
            with self.assertRaises(TimeoutError):veo.generate(self.args)
            with self.assertRaises(ValueError):veo.generate(self.args)
        self.assertEqual(api.models.generate_videos.call_count,1)
        record=json.loads(next((self.root/'runs').glob('*.json')).read_text())
        self.assertEqual(record['state'],'submission_unconfirmed')
    def test_completed_operation_downloads_without_new_generation(self):
        api=Mock();api.operations.get.return_value=SimpleNamespace(done=True,error=None,response=SimpleNamespace(generated_videos=[SimpleNamespace(video='opaque-video')]))
        api.files.download.side_effect=lambda **kw:Path(kw['destination']).write_bytes(b'test-download')
        path=self.root/'job.json';path.write_text(json.dumps({'operation':'operations/test','state':'running'}))
        veo.poll(api,path)
        self.assertEqual(json.loads(path.read_text())['state'],'complete')
        self.assertEqual(path.with_suffix('.mp4').read_bytes(),b'test-download')
        api.models.generate_videos.assert_not_called()

if __name__=='__main__':unittest.main()
