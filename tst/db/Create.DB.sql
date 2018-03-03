

-- User
CREATE USER 'MyEmitter'@'localhost'; --  IDENTIFIED VIA mysql_native_password USING '***';
GRANT RELOAD, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'MyEmitter'@'localhost';


-- Database
CREATE DATABASE `MyEmitter`;
GRANT ALL PRIVILEGES ON `MyEmitter`.* TO 'MyEmitter'@'localhost' WITH GRANT OPTION;


-- Tables
CREATE TABLE `MyEmitter`.`TstTable` (

  `id`      INT(9) UNSIGNED         NOT NULL AUTO_INCREMENT,
  `data`    VARCHAR(256)            NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;



CREATE TABLE `MyEmitter`.`TstFields` (

  `id`      SERIAL,
  
  `f1`      TINYINT             NULL DEFAULT NULL,
  `f2`      SMALLINT            NULL DEFAULT NULL,
  `f3`      MEDIUMINT           NULL DEFAULT NULL,
  `f4`      INT                 NULL DEFAULT NULL,
  
  `f5`      BIGINT              NULL DEFAULT NULL,
  `f6`      DECIMAL             NULL DEFAULT NULL,
  `f7`      FLOAT               NULL DEFAULT NULL,
  `f8`      REAL                NULL DEFAULT NULL,
  
  `f9`      BIT(4)              NULL DEFAULT NULL,
  
  `f10`     DATE                NULL DEFAULT NULL,
  `f11`     DATETIME            NULL DEFAULT NULL,
  `f12`     TIMESTAMP           NULL DEFAULT NULL,
  `f13`     TIME                NULL DEFAULT NULL,
  `f14`     YEAR                NULL DEFAULT NULL,
  
  `f15`     CHAR(8)             NULL DEFAULT NULL,
  `f16`     VARCHAR(8)          NULL DEFAULT NULL,
  
  `f17`     TINYTEXT            NULL DEFAULT NULL,
  `f18`     TEXT                NULL DEFAULT NULL,
  `f19`     MEDIUMTEXT          NULL DEFAULT NULL,
  `f20`     LONGTEXT            NULL DEFAULT NULL,
  
  `f21`     BINARY              NULL DEFAULT NULL,
  `f22`     VARBINARY(8)        NULL DEFAULT NULL,
  
  `f23`     TINYBLOB            NULL DEFAULT NULL,
  `f24`     MEDIUMBLOB          NULL DEFAULT NULL,
  `f25`     BLOB                NULL DEFAULT NULL,
  `f26`     LONGBLOB            NULL DEFAULT NULL,
  
  `f27`     ENUM('e1','e2')     NULL DEFAULT NULL,
  `f28`     SET('s1','s2')      NULL DEFAULT NULL,
  
  `f29`     GEOMETRY            NULL DEFAULT NULL,
  `f30`     POINT               NULL DEFAULT NULL,
  `f31`     LINESTRING          NULL DEFAULT NULL,
  `f32`     POLYGON             NULL DEFAULT NULL,
  `f33`     MULTIPOINT          NULL DEFAULT NULL,
  `f34`     MULTILINESTRING     NULL DEFAULT NULL,
  `f35`     MULTIPOLYGON        NULL DEFAULT NULL,
  `f36`     GEOMETRYCOLLECTION  NULL DEFAULT NULL,

  PRIMARY KEY (`id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- Redundant
-- `fx`      BOOLEAN             NULL DEFAULT NULL,
-- `fx`      SERIAL              NULL DEFAULT NULL,
