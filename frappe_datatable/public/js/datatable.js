// Copyright (c) 2023, 杨嘉祥 and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.provide('frappe.OverrideDataTableComponent');

frappe.OverrideDataTableComponent = (function () {

	const {
		DataManager: DataManagerOrigin,
		BodyRenderer: BodyRendererOrigin,
		RowManager: RowManagerOrigin,
		ColumnManager: ColumnManagerOrigin,
		CellManager: CellManagerOrigin,
		Style: StyleOrigin,
		HyperList,
		utils: {
			$,
			makeDataAttributeString,
		}
	} = frappe.DataTableComponent;

	class BodyRenderer extends BodyRendererOrigin {

		renderRows(rows) {
			this.visibleRows = rows;
			this.visibleRowIndices = rows.map(row => row.meta.rowIndex);

			if (rows.length === 0) {
				this.bodyScrollable.innerHTML = this.getNoDataHTML();
				return;
			}

			const rowViewOrder = this.datamanager.rowViewOrder.map(index => {
				if (this.visibleRowIndices.includes(index)) {
					return index;
				}
				return null;
			}).filter(index => index !== null);

			const computedStyle = getComputedStyle(this.bodyScrollable);

			let config = {
				width: computedStyle.width,
				height: computedStyle.height,
				itemHeight: this.options.cellHeight,
				total: rows.length,
				generate: (index) => {
					const el = document.createElement('div');
					const rowIndex = rowViewOrder[index];
					const row = this.datamanager.getRow(rowIndex);
					const rowHTML = this.rowmanager.getRowHTML(row, row.meta);
					el.innerHTML = rowHTML;
					let element = el.children[0];

					if (this.options.renderRow) {
						element = this.options.renderRow(row, element) || element;
					}

					// 设置高度，使HyperList的_getRow中能够识别到高度
					if (row.height) {
						return {
							height: row.height,
							element,
						}
					}

					return element;
				},
				afterRender: () => {
					this.restoreState();

					// 自定义HyperList渲染后的操作，可在里面调整bodyScrollable的样式
					if (this.options.afterHyperListRender) {
						this.options.afterHyperListRender(this);
					}
				}
			};

			if (!this.hyperlist) {
				this.hyperlist = new HyperList(this.bodyScrollable, config);
			} else {
				this.hyperlist.refresh(this.bodyScrollable, config);
			}

			this.renderFooter();
		}
	}

	class DataManager extends DataManagerOrigin {
		prepareRow(row, meta) {
			row = super.prepareRow(row, meta);

			// 判断get_datatable_options是否有指定高度的设置
			if (this.options.getRowHeight) {
				row.height = this.options.getRowHeight(this.data[meta.rowIndex], meta.rowIndex);
			};

			return row;
		}
	}

	class RowManager extends RowManagerOrigin {

		// 是否冻结列
		isFreezeCol(col) {
			return col.colIndex === 0 || col.freeze || (col.column && col.column.freeze)
		}

		getRowHTML(row, props) {
			const dataAttr = makeDataAttributeString(props);
			let rowIdentifier = props.rowIndex;

			if (props.isFilter) {
				row = row.map(cell => (Object.assign({}, cell, {
					content: this.getFilterInput({
						colIndex: cell.colIndex,
						name: cell.name
					}),
					isFilter: 1,
					isHeader: undefined,
					editable: false
				})));

				rowIdentifier = 'filter';
			}

			if (props.isHeader) {
				rowIdentifier = 'header';
			}

			// 区分冻结的单元格
			let freezeCells = '';
			let unfreezeCells = '';
			row.forEach(cell => {
				const cellHtml = this.cellmanager.getCellHTML(cell);
				if (this.isFreezeCol(cell)) {
					freezeCells += cellHtml;
				} else {
					unfreezeCells += cellHtml;
				}
			});

			// 设置行高度
			const ele = document.createElement('div');
			if (row.height) {
				ele.style.height = row.height + 'px';
			}

			let noFrozenColumns = unfreezeCells;
			if (props.isHeader) {
				noFrozenColumns = `<div class="transform-wrapper">${noFrozenColumns}</div>`
			}

			return `
				<div class="dt-row dt-row-${rowIdentifier}" style="${ele.style.cssText}" ${dataAttr}>
						<div class="frozen-columns">${freezeCells}</div>
						<div class="no-frozen-columns">${noFrozenColumns}</div>
				</div>
				`;
		}
	}

	class ColumnManager extends ColumnManagerOrigin {

		setColumnHeaderWidth(colIndex) {
			colIndex = +colIndex;
			this.$columnMap = this.$columnMap || [];
			const selector = `.dt-cell__content--header-${colIndex}`;
			const {
				width
			} = this.getColumn(colIndex);

			let $column = this.$columnMap[colIndex];
			if (!$column) {
				$column = this.header.querySelector(selector);
				this.$columnMap[colIndex] = $column;
			}

			$column.style.width = width + 'px';

			// 刷新bodyScrollable
			if (this.options.afterHyperListRender) {
				this.options.afterHyperListRender(this.instance);
			}
		}
	}

	class CellManager extends CellManagerOrigin {

		_selectArea($cell1, $cell2) {
			if ($cell1 === $cell2) return false;

			const cells = this.getCellsInRange($cell1, $cell2);
			if (!cells) return false;

			this.clearSelection();
			this._selectedCells = cells.map(index => this.getCell$(...index));
			requestAnimationFrame(() => {
				this._selectedCells
					// 修复折叠后选择报错
					.filter(r => !!r)
					.map($cell => $cell.classList.add('dt-cell--highlight'));
			});
			return true;
		}

		clearSelection() {
			(this._selectedCells || [])
				// 修复折叠后选择报错
				.filter(r => !!r)
				.forEach($cell => $cell.classList.remove('dt-cell--highlight'));

			this._selectedCells = [];
			this.$selectionCursor = null;
		}
	}

	class Style extends StyleOrigin {
		bindScrollHeader() {
			this._settingHeaderPosition = false;

			$.on(this.bodyScrollable, 'scroll', (e) => {
				if (this._settingHeaderPosition) return;

				this._settingHeaderPosition = true;

				requestAnimationFrame(() => {
					const left = -e.target.scrollLeft;

					// 滚动条移动时只需要将未冻结的部分作位移
					[
						this.header.querySelector('.dt-row-header .no-frozen-columns > .transform-wrapper'),
						this.header.querySelector('.dt-row-filter .no-frozen-columns'),
						this.footer.querySelector('.no-frozen-columns'),
					].filter(r => !!r).forEach((r) => $.style(r, { transform: `translateX(${left}px)` }));

					this._settingHeaderPosition = false;
				});
			});
		}

		setCellHeight() {
			// 单元格高度设置为行高
			this.setStyle('.dt-cell', {
				height: '100%'
			});
		}
	}

	return {
		DataManager,
		BodyRenderer,
		RowManager,
		CellManager,
		ColumnManager,
		Style,
	}
})();

frappe.DataTable = class DataTable extends frappe.DataTable {
	render() {
		super.render();

		// 选择列或行
		const { $ } = frappe.DataTableComponent.utils;
		$.on(this.header, 'click', '.dt-row-header .dt-cell', (e, cell) => {
			const { colIndex } = $.data(cell);
			const { visibleRowIndices } = this.bodyRenderer;
			const $startCell = this.cellmanager.getCell$(colIndex, 0);
			const $endCell = this.cellmanager.getCell$(colIndex, Math.max(...visibleRowIndices));
			// this.cellmanager.focusCell($startCell);
			// this.cellmanager.selectArea($endCell);
			this.cellmanager.unfocusCell(this.cellmanager.$focusedCell)
			this.cellmanager._selectArea($startCell, $endCell);
		});
		$.on(this.bodyScrollable, 'click', '.dt-cell--col-0', (e, cell) => {
			const { rowIndex } = $.data(cell);
			const $startCell = this.cellmanager.getCell$(1, rowIndex);
			const $endCell = this.cellmanager.getCell$(this.columnmanager.$columnMap.length - 1, rowIndex);
			// this.cellmanager.focusCell($startCell);
			// this.cellmanager.selectArea($endCell);
			this.cellmanager.unfocusCell(this.cellmanager.$focusedCell)
			this.cellmanager._selectArea($startCell, $endCell);
		});
	}
}

frappe.views.QueryReport = class QueryReport extends frappe.views.QueryReport {
	render_datatable() {
		let data = this.data;
		let columns = this.columns.filter((col) => !col.hidden);

		if (this.raw_data.add_total_row) {
			data = data.slice();
			data.splice(-1, 1);
		}

		this.$report.show();
		if (this.datatable && this.datatable.options
			&& (this.datatable.options.showTotalRow === this.raw_data.add_total_row)) {
			this.datatable.options.treeView = this.tree_report;
			this.datatable.refresh(data, columns);
		} else {
			let datatable_options = {
				columns: columns,
				data: data,
				inlineFilters: true,
				language: frappe.boot.lang,
				translations: frappe.utils.datatable.get_translations(),
				treeView: this.tree_report,
				layout: 'fixed',
				cellHeight: 35, // 默认单元格高度设置为35
				showTotalRow: this.raw_data.add_total_row && !this.report_settings.tree,
				direction: frappe.utils.is_rtl() ? 'rtl' : 'ltr',
				hooks: {
					columnTotal: frappe.utils.report_column_total
				},
				// 覆盖组件
				overrideComponents: frappe.OverrideDataTableComponent
			};

			if (this.report_settings.get_datatable_options) {
				datatable_options = this.report_settings.get_datatable_options(datatable_options);
			}
			this.datatable = new frappe.DataTable(this.$report[0], datatable_options);
		}

		if (typeof this.report_settings.initial_depth == "number") {
			this.datatable.rowmanager.setTreeDepth(this.report_settings.initial_depth);
		}
		if (this.report_settings.after_datatable_render) {
			this.report_settings.after_datatable_render(this.datatable);
		}

		setTimeout(() => {
			this.datatable.setDimensions();
		}, 0)
	}
}