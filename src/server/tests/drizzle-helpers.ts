export const mockSelect = <T>(returnValue: T) => jest.fn(() => ({ from: jest.fn(() => ({ where: jest.fn(() => returnValue) })) }));

export const mockInsert = <T>(returnValue: T) => jest.fn(() => ({ values: jest.fn(() => ({ returning: jest.fn(() => returnValue) })) }));
