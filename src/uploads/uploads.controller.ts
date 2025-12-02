import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { Express } from 'express';

@ApiTags('Uploads-test-567')
@ApiBearerAuth()
@Controller({ path: 'uploads-test-567', version: '1' })
export class UploadsController {
  constructor(private readonly storageService: StorageService) { }

  @Post()
  @ApiOperation({ summary: 'Upload a file to Supabase Storage and return its URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const url = await this.storageService.uploadBuffer({
      buffer: file.buffer,
      contentType: file.mimetype,
      folder: 'uploads',
      filename: file.originalname,
    });
    return { url };
  }
}
