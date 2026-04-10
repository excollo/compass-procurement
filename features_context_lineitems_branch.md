# Compass Procurement - Case context (lineitems branch)

## Current Context
This branch (`lineitems`) is focused on enhancing the line item management within the Purchase Order details view. 

## Key Features & Functionality

### 1. Purchase Order Management
- **Dashboard**: Real-time KPI grid showing Total POs, Pending Value, Active Vendors, and Escalations.
- **Order Listing**: Comprehensive view of all Purchase Orders with status tracking (Open, Closed, etc.).
- **Order Details**: Deep dive into individual POs including:
    - Vendor information (Name, Code).
    - Delivery site details.
    - KPI cards (Total Lines, Delivery Date, Pending Lines, Fulfillment Rate).

### 2. Line Item Ledger (Latest Updates)
- **Inline Editing**: Users can now edit the following fields directly in the table:
    - **Ordered Quantity**: Updates `po_quantity` and automatically recalculates `Open Qty`.
    - **Delivered Quantity**: Updates `delivered_quantity` and automatically recalculates `Open Qty`.
    - **Status**: Editable via a dropdown (Confirm, Pending, Partial, Fulfilled, Cancelled).
- **Persistence**: A **Save** button is integrated into each row, allowing immediate synchronization of changes to the `open_po_detail` table in the Supabase database.
- **Calculated Fields**: `Open Qty` is dynamically updated based on the difference between Ordered and Delivered quantities.
- **UI Improvements**: 
    - Removed the Progress column to streamline the interface.
    - Added **dynamic status coloring** to the dropdown (e.g., green for Fulfilled, red for Pending), improving visual hierarchy and scanability.

### 3. Vendor Interaction & Monitoring
- **Vendor Management**: View of vendor master data.
- **Chat System**: (Context from `hitl.md`)
    - Support for both AI-automated responses and Human-in-the-loop (HITL) takeovers.
    - Tracking of chat ownership (Bot vs. Human).
    - Status events for thread updates (Takeover, Handback, Pause, Resolve).

## Technology Stack
- **Frontend**: React (Vite), Tailwind CSS.
- **Backend/Database**: Supabase (PostgreSQL).
- **Icons**: Google Material Symbols.
- **Typography**: Outfit, Inter.

## Branch Specifics (`lineitems`)
The primary goal of this branch is to make the procurement data more interactive and manageable at the line-item level, providing procurement officers with direct control over quantity and status overrides.
