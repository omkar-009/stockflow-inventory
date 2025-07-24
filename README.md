# StockFlow Development

## Table of Contents
1. Debugging Approach = (#debugging-approach)
2. Database Design = (#database-design)
3. API Implementation = (#api-implementation)

## Debugging Approach

### 1. Issue Identification

- **Problem**: Async/await implementation in alert service
  - **Symptoms**: Race conditions, unhandled promise rejections
  - **Debugging Steps**:
    1. Added detailed logging at key points
    2. Used Node.js debugger for step-through execution
    3. Product-Warehouse Relationship Misunderstood
    4. Price is assumed to be numeric
    5. No Error Handling

- **Problem**: Data validation gaps
  - **Symptoms**: Inconsistent data in database
  - **Debugging Steps**:
    1. No input validation
    2. SKU Uniqueness Not Enforced
    3. Traced data flow through the application

### 2. Solution Implementation
- **Code Structure**:
  - Implemented middleware-based validation
  - Added comprehensive error handling
  - Created custom error classes

- **Testing**:
  - Unit tests for individual components
  - Integration tests for API endpoints
  - End-to-end tests for critical flows

## Database Design

### 1. Schema Architecture

erDiagram
    COMPANY || WAREHOUSE : has
    COMPANY || PRODUCT : owns
    WAREHOUSE || INVENTORY : contains
    PRODUCT || INVENTORY : has
    PRODUCT || SUPPLIER : supplied_by

### 2. Key Design Decisions
- **Normalization**:
  - Split into logical tables (Companies, Warehouses, Products, Inventory)
  - Used foreign keys for relationships
  - Implemented soft deletes with flag

- **Performance**:
  - Added indexes on frequently queried columns
  - Used appropriate data types
  - Implemented pagination for large datasets

## API Implementation

- **RESTful Design**:
  - Resource-oriented endpoints
  - Proper HTTP methods and status codes
  - Consistent naming conventions

- **Error Handling**:
  - Structured error responses
  - Meaningful error messages
  - Proper HTTP status codes

## Security
- Authentication using JWT
- Role-based access control
- Input validation and sanitization
- low stock alert
