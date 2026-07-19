import { Router } from 'express';
import { RepositoryController } from '../controllers/repository.controller';
import { validateRequest } from '../middlewares/validationHandler';
import { AnalyzeRepositorySchema } from '../dtos/repository.dto';

const router = Router();

router.post('/analyze', validateRequest(AnalyzeRepositorySchema), RepositoryController.analyze);
router.get('/summary', RepositoryController.summary);
router.get('/files', RepositoryController.getFiles);
router.get('/dependencies', RepositoryController.getDependencies);
router.get('/git', RepositoryController.getGitData);
router.get('/statistics', RepositoryController.getStatistics);

export default router;
