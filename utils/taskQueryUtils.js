// Date range helper
function getDateRange(range) {
  const now = new Date();
  let start, end;
  end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // exclusive end
  if (range === 'weekly') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); // last 7 days
  } else if (range === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1); // start of month
  } else {
    start = null;
  }
  return { start, end };
}

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

    // Date range filter
    if (queryParams.range) {
      const { start, end } = getDateRange(queryParams.range);
      if (start && end) {
        queryObj.createdAt = { $gte: start, $lt: end };
      }
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
    getSortOption,
    getDateRange
  };
  