require('dotenv').config();

module.exports = {
  default: {
    require: [
      'features/step-definitions/**/*.ts',
      'features/support/**/*.ts'
    ],
    format: [
      'progress',
      'json:reports/cucumber_report.json'
    ],
    paths: ['features/**/*.feature'],
    requireModule: ['ts-node/register'],
    publishQuiet: true,
    timeout: 60000
  }
};
