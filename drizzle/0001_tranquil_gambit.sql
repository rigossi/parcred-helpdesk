CREATE TABLE `correspondents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(256) NOT NULL,
	`document` varchar(32),
	`email` varchar(320),
	`phone` varchar(32),
	`city` varchar(128),
	`state` varchar(2),
	`bankCode` varchar(32),
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `correspondents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ticketId` int,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`type` enum('ticket_opened','ticket_updated','ticket_assigned','ticket_resolved','ticket_closed','sla_warning') NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sla_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`departmentId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`ticketType` enum('technical','commercial','financial') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL,
	`responseTimeHours` int NOT NULL,
	`resolutionTimeHours` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sla_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`messageId` int,
	`uploadedByUserId` int NOT NULL,
	`fileName` varchar(256) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(128),
	`fileSize` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`isInternal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`correspondentId` int NOT NULL,
	`openedByUserId` int NOT NULL,
	`assignedToUserId` int,
	`departmentId` int NOT NULL,
	`slaPolicyId` int,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`ticketType` enum('technical','commercial','financial') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL,
	`status` enum('open','in_progress','waiting_correspondent','resolved','closed') NOT NULL DEFAULT 'open',
	`responseDeadline` timestamp,
	`resolutionDeadline` timestamp,
	`firstResponseAt` timestamp,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','agent','correspondent') NOT NULL DEFAULT 'user';