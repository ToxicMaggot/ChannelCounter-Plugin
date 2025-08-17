/**
 * @name ChannelCounter
 * @author Gemini
 * @version 1.0.0
 * @description Aggiunge il conteggio dei canali accanto al nome di ogni categoria in un server.
 * @authorId 123456789101112131
 */
module.exports = class ChannelCounter {
    constructor() {
        this.unsubscribe = null;
        this.CategoryComponent = null;
    }

    // This function is called when the plugin starts.
    start() {
        // Find the React component for channel categories using Webpack.
        // We look for a module that has a `default` export with a `displayName` that indicates it's a category.
        this.CategoryComponent = BdApi.Webpack.getModule(m => m.default && m.default.displayName === "ConnectedChannelCategory");

        if (!this.CategoryComponent) {
            BdApi.UI.showToast("Impossibile trovare il componente della categoria. Il plugin non funzionerà.", { type: "error" });
            return;
        }

        // Apply an "after" patch to the component's default export.
        // This will run our `onRendered` function after the original render method completes.
        this.unsubscribe = BdApi.Patcher.after("ChannelCounter", this.CategoryComponent, "default", this.onRendered);
        
        BdApi.UI.showToast(`Plugin "${meta.name}" avviato con successo!`, { type: "success" });
    }

    // This function is called when the plugin stops.
    stop() {
        // Unpatch the component to remove our changes.
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        BdApi.UI.showToast(`Plugin "${meta.name}" fermato.`, { type: "info" });
    }

    // This function is executed after the original component renders.
    onRendered(_, __, returnValue) {
        // Find the props for the category's children to count them.
        const categoryChildrenProps = BdApi.Utils.findInTree(returnValue.props.children, m => m?.children, { walkable: ["props", "children"] });

        // If we don't find the children, something is wrong, so we stop.
        if (!categoryChildrenProps) {
            return;
        }

        // Get the number of children (channels) in this category.
        const channelCount = categoryChildrenProps.children.length;
        
        // Find the element that contains the category name.
        const headerTitle = BdApi.Utils.findInTree(returnValue, m => typeof m?.props?.children === 'string', { walkable: ["props", "children"] });

        // If the header title is not found, we can't add the count, so we exit.
        if (!headerTitle) {
            return;
        }
        
        // Create a new React element (a span) to display the channel count.
        const countElement = BdApi.React.createElement("span", {
            // Apply some CSS to position and style the counter.
            style: {
                marginLeft: "8px",
                color: "var(--channels-text-color, var(--text-muted))",
                fontSize: "12px",
                fontWeight: "400",
                opacity: 0.8
            }
        }, `(${channelCount})`);

        // Check if the count element already exists to avoid duplication.
        const hasCounter = Array.isArray(headerTitle.props.children) && headerTitle.props.children.some(child => {
            return child?.props?.style && child.props.style.marginLeft === "8px";
        });

        if (!hasCounter) {
            // Modify the component's children to include our new count element.
            const originalChildren = Array.isArray(headerTitle.props.children) ? headerTitle.props.children : [headerTitle.props.children];
            headerTitle.props.children = [...originalChildren, countElement];
        }
    }
};
