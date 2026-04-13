ALTER TABLE `portals` ADD `heroBadgeLabel` varchar(255) DEFAULT 'Portal Oficial de Torneios';--> statement-breakpoint
ALTER TABLE `portals` ADD `heroOverlayOpacity` int DEFAULT 80;--> statement-breakpoint
ALTER TABLE `portals` ADD `generalRegulation` longtext;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `regulation` longtext;