## Accessible Chart Controls

To ensure full screen-reader and keyboard navigation compliance (WCAG 2.1 AA):
- **ARIA Labeling**: All chart time-range buttons and metric toggles feature explicit descriptive `aria-label` attributes.
- **State Semantics**: Active button states are communicated to assistive technologies using `aria-pressed="true|false"`.
- **Grouping**: Control sets are wrapped in semantic `role="group"` containers with descriptive aria labels.

## Chart timezone handling (#439)

Chart axis and tooltip timestamps are formatted with `Intl.DateTimeFormat` using **UTC by default** via `frontend/src/utils/formatChartDate.ts`. This keeps series labels stable across browsers and locales. Pass an IANA timezone (or `'local'`) when a caller needs a different zone.
