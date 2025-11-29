const { GetLeadsQueryDto } = require('./dist/modules/leads/dto/leads.dto');
const { validate } = require('class-validator');
const { plainToClass } = require('class-transformer');

// Test data
const queryData = {
  view: 'table',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: '1',
  limit: '25'
};

const dtoInstance = plainToClass(GetLeadsQueryDto, queryData);
console.log('DTO Instance:', dtoInstance);

validate(dtoInstance).then(errors => {
  if (errors.length > 0) {
    console.log('Validation errors:', errors);
  } else {
    console.log('✅ Validation passed!');
  }
});
