/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paginator, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function PaginatorTab() {
    const [page1, setPage1] = useState(1);
    const [page2, setPage2] = useState(1);
    const [page3, setPage3] = useState(1);
    const [page4, setPage4] = useState(1);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Pagination component for navigating through pages of content.
                </Paragraph>
                <Paginator
                    currentPage={page1}
                    totalCount={100}
                    pageSize={10}
                    onPageChange={setPage1}
                />
            </SectionWrapper>

            <SectionWrapper title="Max Visible Pages">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Control how many page numbers are visible at once.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center" }}>
                        <Paginator
                            currentPage={page2}
                            totalCount={100}
                            pageSize={10}
                            maxVisiblePages={3}
                            onPageChange={setPage2}
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            3 visible
                        </Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Paginator
                            currentPage={page3}
                            totalCount={100}
                            pageSize={10}
                            maxVisiblePages={7}
                            onPageChange={setPage3}
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            7 visible
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Options">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Additional configuration options for the paginator.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center" }}>
                        <Paginator
                            currentPage={page4}
                            totalCount={100}
                            pageSize={10}
                            hideMaxPage
                            onPageChange={setPage4}
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            hideMaxPage
                        </Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Paginator
                            currentPage={page4}
                            totalCount={50}
                            pageSize={10}
                            disablePaginationGap
                            onPageChange={setPage4}
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            disablePaginationGap
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • currentPage: number - Current active page
                </Paragraph>
                <Paragraph color="text-muted">
                    • totalCount: number - Total number of items
                </Paragraph>
                <Paragraph color="text-muted">
                    • pageSize: number - Items per page
                </Paragraph>
                <Paragraph color="text-muted">
                    • onPageChange?: (page: number) =&gt; void - Page change callback
                </Paragraph>
                <Paragraph color="text-muted">
                    • maxVisiblePages?: number - Max page numbers shown
                </Paragraph>
                <Paragraph color="text-muted">
                    • hideMaxPage?: boolean - Hide last page number
                </Paragraph>
                <Paragraph color="text-muted">
                    • disablePaginationGap?: boolean - Remove ellipsis gaps
                </Paragraph>
                <Paragraph color="text-muted">
                    • className?: string - Additional CSS class
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
