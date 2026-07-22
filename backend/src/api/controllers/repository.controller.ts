import { Request, Response, NextFunction } from 'express';
import { RepositoryService } from '../services/repository.service';
import { AnalyzeRepositoryDto } from '../dtos/repository.dto';

const repositoryService = RepositoryService.getInstance();

/** Reads the optional analysisId query parameter. */
const analysisIdOf = (req: Request): string | undefined =>
  typeof req.query.analysisId === 'string' && req.query.analysisId.length > 0
    ? req.query.analysisId
    : undefined;

export class RepositoryController {

  public static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as AnalyzeRepositoryDto;
      const { analysisId, model } = await repositoryService.analyzeRepository(dto.path, {
        maxCommits: dto.maxCommits,
      });

      // Return metadata only; the (potentially large) file/graph/git payloads
      // are fetched by dedicated endpoints keyed by analysisId.
      res.status(200).json({
        success: true,
        data: {
          analysisId,
          path: model.path,
          name: model.name,
          statistics: model.statistics
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static summary(req: Request, res: Response, next: NextFunction) {
    try {
      const model = repositoryService.getModel(analysisIdOf(req));
      res.status(200).json({ success: true, data: { path: model.path, name: model.name, statistics: model.statistics } });
    } catch (error) {
      next(error);
    }
  }

  public static getFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const files = repositoryService.getFiles(analysisIdOf(req));
      res.status(200).json({ success: true, data: files });
    } catch (error) {
      next(error);
    }
  }

  public static getDependencies(req: Request, res: Response, next: NextFunction) {
    try {
      const dependencies = repositoryService.getDependencies(analysisIdOf(req));
      res.status(200).json({ success: true, data: dependencies });
    } catch (error) {
      next(error);
    }
  }

  public static getGitData(req: Request, res: Response, next: NextFunction) {
    try {
      const offset = req.query.offset !== undefined ? Number(req.query.offset) : 0;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
      const git = repositoryService.getGitData(
        analysisIdOf(req),
        Number.isFinite(offset) && offset >= 0 ? offset : 0,
        limit !== undefined && Number.isFinite(limit) && limit >= 0 ? limit : undefined,
      );
      res.status(200).json({ success: true, data: git });
    } catch (error) {
      next(error);
    }
  }

  public static getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = repositoryService.getStatistics(analysisIdOf(req));
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  public static async getFileContent(req: Request, res: Response, next: NextFunction) {
    try {
      const pathParam = req.query.path as string;
      const content = await repositoryService.getFileContent(pathParam, analysisIdOf(req));
      res.status(200).json({ success: true, data: content });
    } catch (error) {
      next(error);
    }
  }
}
