import { TipidModule } from './modules/tipid.js';
import { TransferModule } from './modules/transfer.js';
import { TechCareModule } from './modules/techcare.js';

export function createModule(type, deviceType = 'cellphone') {
    switch(type) {
        case 'tipid': return new TipidModule();
        case 'transfer': return new TransferModule();
        case 'techcare': return new TechCareModule(deviceType);
        default: throw new Error('Invalid Module');
    }
}
