import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/createComment.dto';
import { UpdateCommentDto } from './dto/updateComment.dto';

@Injectable()
export class CommentService {
  constructor(private prismaService: PrismaService) {}

  async create(createCommentDto: CreateCommentDto, userId: any) {
    const { postId, content } = createCommentDto;
    const post = await this.prismaService.post.findUnique({
      where: { postId },
    });
    if (!post) throw new NotFoundException('Post not found');
    await this.prismaService.comment.create({
      data: { content, postId, userId },
    });
    return { data: 'Comment created successfully' };
  }

  async delete(postId: number, commentId: number, userId: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: { commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.postId !== postId)
      throw new UnauthorizedException('Post id does not match');
    if (comment.userId !== userId) throw new ForbiddenException('Unauthorized');
    await this.prismaService.comment.delete({ where: { commentId } });
    return { data: 'Comment deleted successfully' };
  }

  async update(
    commentId: number,
    userId: number,
    updateCommentDto: UpdateCommentDto,
  ) {
    const { content, postId } = updateCommentDto;
    const comment = await this.prismaService.comment.findUnique({
      where: { commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.postId !== postId)
      throw new UnauthorizedException('Post id does not match');
    if (comment.userId !== userId) throw new ForbiddenException('Unauthorized');
    await this.prismaService.comment.update({
      where: { commentId },
      data: { content },
    });
    return { data: 'Comment updated successfully' };
  }
}
