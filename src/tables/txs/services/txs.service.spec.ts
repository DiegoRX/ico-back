import { Test, TestingModule } from '@nestjs/testing';
import { TxsService } from './txs.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from 'src/users/entities/user.schema';
import { Tx } from '../entities/txs.schema';

describe('TxsService', () => {
  let service: TxsService;
  let txModel: any;
  let userModel: any;

  const mockTxModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TxsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Tx.name),
          useValue: mockTxModel,
        },
      ],
    }).compile();

    service = module.get<TxsService>(TxsService);
    txModel = module.get(getModelToken(Tx.name));
    userModel = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTx', () => {
    it('should return existing transaction if already processed', async () => {
      const mockDto = { txHash: '0x123', networkId: '137' } as any;
      const mockExisting = { txHash: '0x123' };
      
      txModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExisting),
      });

      const result = await service.createTx(mockDto);
      expect(result).toEqual(mockExisting);
      expect(txModel.findOne).toHaveBeenCalled();
    });

    // More tests could be added here to mock blockchain verify logic
  });
});
