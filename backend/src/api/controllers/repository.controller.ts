import { Request, Response, NextFunction } from 'express';
import { RepositoryService } from '../services/repository.service';
import { AnalyzeRepositoryDto } from '../dtos/repository.dto';

const repositoryService = RepositoryService.getInstance();

export class RepositoryController {
  
  public static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as AnalyzeRepositoryDto;
      const result = await repositoryService.analyzeRepository(dto.path);
      
      // We don't want to return the massive JSON map immediately to save bandwidth,
      // but for Phase 7 API spec, we can return a success indicator or the full model.
      // Returning just metadata prevents overwhelming the network layer if repo is huge.
      res.status(200).json({
        success: true,
        data: {
          path: result.path,
          name: result.name,
          statistics: result.statistics
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static summary(req: Request, res: Response, next: NextFunction) {
    try {
      const model = repositoryService.getModel();
      res.status(200).json({ success: true, data: { path: model.path, name: model.name, statistics: model.statistics } });
    } catch (error) {
      next(error);
    }
  }

  public static getFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const files = repositoryService.getFiles();
      res.status(200).json({ success: true, data: files });
    } catch (error) {
      next(error);
    }
  }

  public static getDependencies(req: Request, res: Response, next: NextFunction) {
    try {
      const dependencies = repositoryService.getDependencies();
      res.status(200).json({ success: true, data: dependencies });
    } catch (error) {
      next(error);
    }
  }

  public static getGitData(req: Request, res: Response, next: NextFunction) {
    try {
      const git = repositoryService.getGitData();
      res.status(200).json({ success: true, data: git });
    } catch (error) {
      next(error);
    }
  }

  public static getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = repositoryService.getStatistics();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
