import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/scheduling/repositories/shift.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/scheduling/repositories/assignment.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { CoverageEligibilityService } from '../../domain/coverage/services/coverage-eligibility.domain-service';
import { DropRequestEntity } from '../../domain/coverage/entities/drop-request.entity';
import { randomUUID } from 'crypto';

export interface RequestDropInput {
  shiftId: string;
  requesterId: string;
}

@Injectable()
export class RequestDropUseCase implements IUseCase<RequestDropInput, DropRequestEntity> {
  private eligibilityService = new CoverageEligibilityService();

  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private readonly dropRepo: IDropRequestRepository,
    @Inject(SHIFT_REPOSITORY) private readonly shiftRepo: IShiftRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: RequestDropInput): Promise<DropRequestEntity> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const requester = await this.userRepo.findById(input.requesterId);
    if (!requester) throw new NotFoundException('User not found');

    // Check the user is actually assigned to this shift
    const assignments = await this.assignmentRepo.findByShiftId(input.shiftId);
    const userAssignment = assignments.find(
      (a) => a.userId === input.requesterId && a.isActive(),
    );
    if (!userAssignment) throw new BadRequestException('You are not assigned to this shift');

    // Check eligibility
    const pendingCount = await this.dropRepo.countPendingByRequesterId(input.requesterId);
    const eligibility = this.eligibilityService.canRequestDrop(requester, shift, pendingCount);
    if (eligibility.isFailure) {
      throw new BadRequestException(eligibility.error.message);
    }

    const expiresAt = DropRequestEntity.calculateExpiresAt(shift.startTime);

    const drop = DropRequestEntity.create(
      {
        shiftId: input.shiftId,
        requesterId: input.requesterId,
        status: 'OPEN',
        pickedUpById: null,
        managerId: null,
        managerNote: null,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      randomUUID(),
    );

    // Mark the user's assignment as dropped
    userAssignment.markDropped();
    await this.assignmentRepo.save(userAssignment);

    return this.dropRepo.save(drop);
  }
}
