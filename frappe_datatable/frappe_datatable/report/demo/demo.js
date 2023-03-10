// Copyright (c) 2023, 杨嘉祥 and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Demo"] = {
	"tree": true,
	"initial_depth": 2,
	"parent_field": "parent_id",
	"name_field": "id",
	"get_datatable_options": (options) => {
		return Object.assign(options, {
			getRowHeight(row) {
				// 设置高度
				return row.id % 3 == 0 ? 93 : 35
			},
			afterHyperListRender: (datatable) => {

				/**
				 * 合并行单元格
				 * @param {function|array|string} predicate 为数组时应该指定相邻的几个单元格
				 */
				const mergeRowCells = (columns, rowElement, predicate) => {
					const cols = columns.filter(r => {
						if (typeof fieldnames === 'function') {
							return predicate(r);
						} else if (Array.isArray(predicate)) {
							return predicate.includes(r.fieldname);
						} else {
							return r.content === predicate;
						}
					});
					// 合并后的宽度
					const width = cols.reduce((sum, next) => sum + next.width, 0) + cols.length - 1;
					cols.forEach((col) => {
						const el = rowElement.querySelector(`.dt-cell--col-${col.colIndex}`);
						// 只显示第一个单元格，其他的隐藏
						if (col.colIndex === cols[0].colIndex) {
							el.querySelector(`.dt-cell__content--col-${col.colIndex}`).style.width = width + 'px';
						} else {
							el.style.display = 'none';
						}
					});
				}

				datatable.bodyScrollable.querySelectorAll('.dt-row').forEach(element => {
					const { rowIndex } = element.dataset;
					const { columns, data: rowDatas } = datatable.datamanager;
					const rowData = rowDatas[rowIndex];

					if (rowData.id % 3 == 0) {
						// 合并单元格
						mergeRowCells(columns, element, [
							'col-4',
							'col-5',
							'col-6',
						]);

						// 设置行样式
						element.querySelectorAll('.dt-cell').forEach(el => {
							el.style.backgroundColor = '#d8e4bc'
							el.querySelector('.dt-cell__content').classList.add(
								'd-flex',
								'flex-column',
								'justify-content-center',
								'text-wrap',
							)
						});
					}
				})
			},
		});
	},
	"filters": [

	]
};
