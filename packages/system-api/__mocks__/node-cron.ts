const cron: {
  schedule: typeof schedule;
} = jest.genMockFromModule('node-cron');

const schedule = (scd: string, cb: () => void) => {
  cb();
};

cron.schedule = schedule;

module.exports = cron;
