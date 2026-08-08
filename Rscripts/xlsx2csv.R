### encodé u8

rm(list=ls())

setwd("//infra.vs.ch/dfs/SCA-DLW/PDIRECTS/1_Marie/7_dev/github.io/checklist-controle/Rscripts")


.libPaths("G:/PDIRECTS/1_Marie/7_dev/R/win-library/4.1")
library(marzutils)

.libPaths("G:/PDIRECTS/1_Marie/7_dev/R/win-library/4.1D")

library(readxl)
library(openxlsx)
library(reshape2)

cat_dt <- data.frame(read_excel("../data/mapping_rub_prog_2026.xlsx", guess_max = Inf, col_names = F))
dt <- data.frame(read_excel("../data/mapping_rub_prog_2026.xlsx", guess_max = Inf, skip = 1))

stopifnot(apply(dt[,3:ncol(dt)],1,sum) > 0)

library(zoo)
vec <- c(unlist(cat_dt[1, 3:ncol(cat_dt)]))
vec_complete <- na.locf(vec)

col2cat <- setNames(vec_complete, colnames(dt)[3:ncol(dt)])

label_dt <- data.frame(id = names(col2cat),
                       label="",
                       groupe = as.character(col2cat), stringsAsFactors = FALSE)

dep_dt <- data.frame(option=colnames(dt)[grepl("^insc_", colnames(dt))],
                     condition="", stringsAsFactors = FALSE)

ldt <- reshape2::melt(dt, id=c("rubrique.id", "rubrique.label"))
ldt <- ldt[ldt$value==1,]
stopifnot(nrow(ldt) > 0)
tmp_dt <- data.frame(id=ldt$rubrique.id,
                     label=ldt$rubrique.label,
                     groupe = col2cat[paste0(ldt$variable)],
                     condition=as.character(ldt$variable),
                     stringsAsFactors = FALSE)
stopifnot(!is.na(tmp_dt))

stopifnot("contrôle" %in% tmp_dt$groupe)
rub_dt <- tmp_dt[tmp_dt$groupe!="contrôle",]
control_dt <- tmp_dt[tmp_dt$groupe=="contrôle",]

stopifnot(!grepl(";", label_dt))
stopifnot(!grepl(";", dep_dt))
stopifnot(!grepl(";", rub_dt))
stopifnot(!grepl(";", control_dt))

write.table(label_dt, file = "labels.csv", sep = ";", row.names = FALSE, quote = FALSE,fileEncoding = "UTF-8" )
write.table(dep_dt, file = "dependances.csv", sep = ";", row.names = FALSE, quote = FALSE,fileEncoding = "UTF-8")
write.table(rub_dt, file = "rubriques.csv", sep = ";", row.names = FALSE, quote = FALSE,fileEncoding = "UTF-8")
write.table(control_dt, file = "controles.csv", sep = ";", row.names = FALSE, quote = FALSE,fileEncoding = "UTF-8")


## dependances.csv
# option;condition
# insc_PLVH;UGB_bovins
# insc_PLVH;UGB_équidés
# insc_SST;UGB_bovins


## labels.csv
# id;label;groupe
# été;Été;saison
# hiver;Hiver;saison
# herbages;Herbages;cultures
# cultures_pérennes;Cultures pérennes;cultures
# vigne;Vigne;cultures
# terres_assolées;Terres assolées;cultures
# baies;Baies;cultures


# rubriques.csv
# id;label;groupe;condition
# 07.01_2023;PER Généralités;saison;été
# 07.01_2023;PER Généralités;cultures;herbages
# 07.01_2023;PER Généralités;cultures;cultures_pérennes
# 07.01_2023;PER Généralités;cultures;vigne
# 07.01_2023;PER Généralités;cultures;terres_assolées
# 07.01_2023;PER Généralités;cultures;baies


## controles.csv
# rubrique;controle
# 07.01_2023;Carnet des prés/champs
# 07.01_2023;Bilan de fumure
# 07.06_2021;Carnet des prés/champs

