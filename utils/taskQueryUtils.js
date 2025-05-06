// buildTaskQuery handles search and filtering
function buildTaskQuery(queryParams) {
    const queryObj = {};
  
    // 🔍 Search
    if (queryParams.search) {
      const keyword = queryParams.search;
      queryObj.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
    }
  
    //  Filter (e.g., by status)
    if (queryParams.status) {
      queryObj.status = queryParams.status;
    }
  
    return queryObj;
  }
  
  //  Sorting logic
  function getSortOption(sortParam) {
    if (!sortParam) return {}; // no sort applied
  
    let sortField = sortParam;
    let sortOrder = 1; // default ascending
  
    // If user sends something like "-createdAt", sort descending
    if (sortParam.startsWith("-")) {
      sortField = sortParam.substring(1);
      sortOrder = -1;
    }
  
    const sortOption = {};
    sortOption[sortField] = sortOrder;
  
    return sortOption;
  }
  
  module.exports = {
    buildTaskQuery,
    getSortOption
  };
  