# Copyright (c) 2023, 杨嘉祥 and contributors
# For license information, please see license.txt

# import frappe
from functools import reduce


def execute(filters=None):
  columns, data = [], []

  cols = list(range(50))
  rows = list(range(40))

  for col in cols:
    columns.append({
        "label": "Column " + str(col),
        "fieldname": "col-" + str(col),
        "fieldtype": "Data",
        "width": 120,
        "freeze": col <= 2,  # 冻结列
    })

  for row in rows:
    rowData = {
        # 树形结构
        "id": row,
        "parent_id": None if row == 0 else int(row/3),
        "indent": 0 if row % 3 == 0 else 1,
    }
    for col in cols:
      key = "col-"+str(col)
      value = "val-{0}-{1}".format(row, col)
      if col <= 2:
        value = "freeze-col-{0}-{1}".format(row, col)
      rowData.setdefault(key, value)
    data.append(rowData)

  return columns, data
